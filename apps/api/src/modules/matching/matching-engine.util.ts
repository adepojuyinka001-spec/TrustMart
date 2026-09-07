// Pure, deterministic matching scoring engine — no I/O, no DB, no AI. Given the same
// inputs it always returns the same output, satisfying the "deterministic and
// reproducible" non-negotiable (CLAUDE.md SS4; Blueprint SS9). The orchestration layer
// (matching.service.ts) is responsible for loading data and persisting the result;
// AI, if ever used here, may only explain a result — never compute the score
// (CLAUDE.md SS11).

export type AttributeDataType = "STRING" | "NUMBER" | "BOOLEAN" | "ENUM" | "MULTI_ENUM";
export type RequirementType = "HARD" | "PREFERRED";
export type RequirementOperator = "EQUALS" | "NOT_EQUALS" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "CONTAINS";

export interface CriterionResult {
  criterionKey: string;
  requirementType: RequirementType;
  operator?: RequirementOperator;
  buyerValue?: string | null;
  listingValue?: string | null;
  weight: number;
  passed: boolean;
  criterionScorePercent: number | null;
}

export interface BudgetInput {
  minMinorUnits: number | null;
  maxMinorUnits: number | null;
  flexible: boolean;
  listingPriceMinorUnits: number;
  weight: number;
}

export interface LocationInput {
  preferredLocations: string[];
  flexible: boolean;
  listing: { country?: string | null; state?: string | null; city?: string | null };
  weight: number;
}

export interface RequirementInput {
  attributeKey: string;
  dataType: AttributeDataType;
  operator: RequirementOperator;
  buyerValue: string;
  requirementType: RequirementType;
  weight: number;
  /** null when the seller never set this attribute on the listing. */
  listingValue: string | null;
}

export interface EvaluateMatchInput {
  budget?: BudgetInput;
  location?: LocationInput;
  requirements: RequirementInput[];
}

export interface EvaluateMatchResult {
  hardFailed: boolean;
  hardFailureReason: string | null;
  scorePercent: number;
  criterionResults: CriterionResult[];
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected a numeric value, got "${value}"`);
  }
  return parsed;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function compareOperator(
  operator: RequirementOperator,
  dataType: AttributeDataType,
  buyerValue: string,
  listingValue: string,
): boolean {
  switch (operator) {
    case "EQUALS":
      return dataType === "NUMBER"
        ? parseNumber(buyerValue) === parseNumber(listingValue)
        : buyerValue.trim().toLowerCase() === listingValue.trim().toLowerCase();
    case "NOT_EQUALS":
      return !compareOperator("EQUALS", dataType, buyerValue, listingValue);
    case "GT":
      return parseNumber(listingValue) > parseNumber(buyerValue);
    case "GTE":
      return parseNumber(listingValue) >= parseNumber(buyerValue);
    case "LT":
      return parseNumber(listingValue) < parseNumber(buyerValue);
    case "LTE":
      return parseNumber(listingValue) <= parseNumber(buyerValue);
    case "IN": {
      const accepted = parseJsonArray(buyerValue).map((v) => v.trim().toLowerCase());
      return accepted.includes(listingValue.trim().toLowerCase());
    }
    case "CONTAINS": {
      const listingOptions = parseJsonArray(listingValue).map((v) => v.trim().toLowerCase());
      return listingOptions.includes(buyerValue.trim().toLowerCase());
    }
    default:
      return false;
  }
}

function evaluateBudget(input: BudgetInput): CriterionResult {
  const { minMinorUnits, maxMinorUnits, flexible, listingPriceMinorUnits, weight } = input;
  const withinRange =
    (minMinorUnits === null || listingPriceMinorUnits >= minMinorUnits) &&
    (maxMinorUnits === null || listingPriceMinorUnits <= maxMinorUnits);
  const buyerValue = `${minMinorUnits ?? ""}-${maxMinorUnits ?? ""}`;
  const listingValue = String(listingPriceMinorUnits);

  if (!flexible) {
    return {
      criterionKey: "BUDGET",
      requirementType: "HARD",
      weight,
      buyerValue,
      listingValue,
      passed: withinRange,
      criterionScorePercent: withinRange ? 100 : 0,
    };
  }

  // Flexible: price above budget degrades score linearly to 0 at 2x the max budget.
  // Below the minimum (a cheaper deal than expected) never penalizes the buyer.
  let score = 100;
  if (!withinRange && maxMinorUnits !== null && listingPriceMinorUnits > maxMinorUnits) {
    const overBy = listingPriceMinorUnits - maxMinorUnits;
    score = Math.max(0, 100 - (overBy / maxMinorUnits) * 100);
  }

  return {
    criterionKey: "BUDGET",
    requirementType: "PREFERRED",
    weight,
    buyerValue,
    listingValue,
    passed: true,
    criterionScorePercent: score,
  };
}

function evaluateLocation(input: LocationInput): CriterionResult {
  const { preferredLocations, flexible, listing, weight } = input;
  const normalizedPreferred = preferredLocations.map((l) => l.trim().toLowerCase()).filter(Boolean);
  const listingLocations = [listing.city, listing.state, listing.country]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.trim().toLowerCase());
  const matches = normalizedPreferred.length === 0 || listingLocations.some((loc) => normalizedPreferred.includes(loc));
  const buyerValue = normalizedPreferred.join(",");
  const listingValue = listingLocations.join(",");

  if (!flexible) {
    return {
      criterionKey: "LOCATION",
      requirementType: "HARD",
      weight,
      buyerValue,
      listingValue,
      passed: matches,
      criterionScorePercent: matches ? 100 : 0,
    };
  }

  return {
    criterionKey: "LOCATION",
    requirementType: "PREFERRED",
    weight,
    buyerValue,
    listingValue,
    passed: true,
    criterionScorePercent: matches ? 100 : 0,
  };
}

function evaluateRequirement(req: RequirementInput): CriterionResult {
  const base = {
    criterionKey: req.attributeKey,
    requirementType: req.requirementType,
    operator: req.operator,
    buyerValue: req.buyerValue,
    listingValue: req.listingValue,
    weight: req.weight,
  };

  if (req.listingValue === null) {
    // Seller never set this attribute. A HARD requirement can't be verified, so it fails
    // closed; a PREFERRED requirement simply scores 0 without blocking the match.
    return {
      ...base,
      passed: req.requirementType !== "HARD",
      criterionScorePercent: 0,
    };
  }

  const passed = compareOperator(req.operator, req.dataType, req.buyerValue, req.listingValue);

  if (req.requirementType === "HARD") {
    return { ...base, passed, criterionScorePercent: passed ? 100 : 0 };
  }

  return { ...base, passed: true, criterionScorePercent: passed ? 100 : 0 };
}

export function evaluateMatch(input: EvaluateMatchInput): EvaluateMatchResult {
  const criterionResults: CriterionResult[] = [];
  let hardFailed = false;
  let hardFailureReason: string | null = null;

  const registerHardFailure = (reason: string) => {
    hardFailed = true;
    hardFailureReason = hardFailureReason ?? reason;
  };

  if (input.budget) {
    const result = evaluateBudget(input.budget);
    criterionResults.push(result);
    if (result.requirementType === "HARD" && !result.passed) {
      registerHardFailure("price_outside_budget");
    }
  }

  if (input.location) {
    const result = evaluateLocation(input.location);
    criterionResults.push(result);
    if (result.requirementType === "HARD" && !result.passed) {
      registerHardFailure("listing_outside_preferred_locations");
    }
  }

  for (const requirement of input.requirements) {
    const result = evaluateRequirement(requirement);
    criterionResults.push(result);
    if (result.requirementType === "HARD" && !result.passed) {
      registerHardFailure(`hard_requirement_failed:${requirement.attributeKey}`);
    }
  }

  const scoredCriteria = criterionResults.filter(
    (c) => c.requirementType === "PREFERRED" && c.criterionScorePercent !== null,
  );
  const totalWeight = scoredCriteria.reduce((sum, c) => sum + c.weight, 0);
  const scorePercent =
    totalWeight > 0
      ? scoredCriteria.reduce((sum, c) => sum + c.weight * (c.criterionScorePercent ?? 0), 0) / totalWeight
      : 100;

  return {
    hardFailed,
    hardFailureReason,
    scorePercent: Math.round(scorePercent * 100) / 100,
    criterionResults,
  };
}
