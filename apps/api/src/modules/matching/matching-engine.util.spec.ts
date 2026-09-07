import { evaluateMatch, type EvaluateMatchInput } from "./matching-engine.util";

describe("evaluateMatch (deterministic scoring engine)", () => {
  it("is deterministic: identical input always produces identical output", () => {
    const input: EvaluateMatchInput = {
      budget: { minMinorUnits: 100, maxMinorUnits: 500, flexible: false, listingPriceMinorUnits: 300, weight: 20 },
      requirements: [
        {
          attributeKey: "bedrooms",
          dataType: "NUMBER",
          operator: "GTE",
          buyerValue: "3",
          requirementType: "PREFERRED",
          weight: 10,
          listingValue: "4",
        },
      ],
    };

    const first = evaluateMatch(input);
    const second = evaluateMatch(input);
    expect(second).toEqual(first);
  });

  describe("hard requirements gate before scoring", () => {
    it("hard-fails when a HARD attribute requirement is not met (negative path)", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "propertyType",
            dataType: "ENUM",
            operator: "EQUALS",
            buyerValue: "duplex",
            requirementType: "HARD",
            weight: 30,
            listingValue: "bungalow",
          },
        ],
      });

      expect(result.hardFailed).toBe(true);
      expect(result.hardFailureReason).toBe("hard_requirement_failed:propertyType");
    });

    it("passes when the HARD attribute requirement is met (positive path)", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "propertyType",
            dataType: "ENUM",
            operator: "EQUALS",
            buyerValue: "duplex",
            requirementType: "HARD",
            weight: 30,
            listingValue: "Duplex",
          },
        ],
      });

      expect(result.hardFailed).toBe(false);
      expect(result.hardFailureReason).toBeNull();
    });

    it("fails a HARD requirement closed when the seller never set the attribute", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "bedrooms",
            dataType: "NUMBER",
            operator: "GTE",
            buyerValue: "3",
            requirementType: "HARD",
            weight: 10,
            listingValue: null,
          },
        ],
      });

      expect(result.hardFailed).toBe(true);
    });

    it("does not block the match when the missing attribute is only PREFERRED", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "hasPool",
            dataType: "BOOLEAN",
            operator: "EQUALS",
            buyerValue: "true",
            requirementType: "PREFERRED",
            weight: 5,
            listingValue: null,
          },
        ],
      });

      expect(result.hardFailed).toBe(false);
      expect(result.scorePercent).toBe(0);
    });
  });

  describe("weighted scoring over PREFERRED criteria", () => {
    it("computes a deterministic weighted average across multiple PREFERRED criteria", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "bedrooms",
            dataType: "NUMBER",
            operator: "GTE",
            buyerValue: "3",
            requirementType: "PREFERRED",
            weight: 30,
            listingValue: "4", // passes -> 100
          },
          {
            attributeKey: "hasPool",
            dataType: "BOOLEAN",
            operator: "EQUALS",
            buyerValue: "true",
            requirementType: "PREFERRED",
            weight: 10,
            listingValue: "false", // fails -> 0
          },
        ],
      });

      // (30*100 + 10*0) / 40 = 75
      expect(result.scorePercent).toBe(75);
      expect(result.hardFailed).toBe(false);
    });

    it("returns 100 when there are no scoreable PREFERRED criteria (only hard gates apply)", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "propertyType",
            dataType: "ENUM",
            operator: "EQUALS",
            buyerValue: "duplex",
            requirementType: "HARD",
            weight: 30,
            listingValue: "duplex",
          },
        ],
      });

      expect(result.scorePercent).toBe(100);
    });
  });

  describe("budget criterion", () => {
    it("hard-fails an inflexible buyer when price is outside the budget range", () => {
      const result = evaluateMatch({
        budget: { minMinorUnits: 100, maxMinorUnits: 200, flexible: false, listingPriceMinorUnits: 500, weight: 20 },
        requirements: [],
      });

      expect(result.hardFailed).toBe(true);
      expect(result.hardFailureReason).toBe("price_outside_budget");
    });

    it("passes an inflexible buyer when price is within the budget range", () => {
      const result = evaluateMatch({
        budget: { minMinorUnits: 100, maxMinorUnits: 200, flexible: false, listingPriceMinorUnits: 150, weight: 20 },
        requirements: [],
      });

      expect(result.hardFailed).toBe(false);
      expect(result.scorePercent).toBe(100);
    });

    it("never hard-fails a flexible buyer, and degrades score linearly above budget", () => {
      const result = evaluateMatch({
        budget: { minMinorUnits: 100, maxMinorUnits: 200, flexible: true, listingPriceMinorUnits: 300, weight: 20 },
        requirements: [],
      });

      // 100 minor units over a 200 max => 50% over => score 50
      expect(result.hardFailed).toBe(false);
      expect(result.scorePercent).toBe(50);
    });

    it("gives full score to a flexible buyer when price is below the minimum (a cheaper deal)", () => {
      const result = evaluateMatch({
        budget: { minMinorUnits: 200, maxMinorUnits: 400, flexible: true, listingPriceMinorUnits: 50, weight: 20 },
        requirements: [],
      });

      expect(result.scorePercent).toBe(100);
    });
  });

  describe("location criterion", () => {
    it("hard-fails an inflexible buyer when the listing is outside preferred locations", () => {
      const result = evaluateMatch({
        location: {
          preferredLocations: ["Lekki", "Ikoyi"],
          flexible: false,
          listing: { city: "Ibadan", state: "Oyo", country: "Nigeria" },
          weight: 15,
        },
        requirements: [],
      });

      expect(result.hardFailed).toBe(true);
      expect(result.hardFailureReason).toBe("listing_outside_preferred_locations");
    });

    it("matches case-insensitively against city or state (positive path)", () => {
      const result = evaluateMatch({
        location: {
          preferredLocations: ["lekki"],
          flexible: false,
          listing: { city: "Lekki", state: "Lagos", country: "Nigeria" },
          weight: 15,
        },
        requirements: [],
      });

      expect(result.hardFailed).toBe(false);
    });

    it("treats an empty preferred-locations list as no constraint", () => {
      const result = evaluateMatch({
        location: { preferredLocations: [], flexible: false, listing: { city: "Anywhere" }, weight: 15 },
        requirements: [],
      });

      expect(result.hardFailed).toBe(false);
    });
  });

  describe("operators", () => {
    const evalOne = (operator: EvaluateMatchInput["requirements"][number]["operator"], buyerValue: string, listingValue: string) =>
      evaluateMatch({
        requirements: [
          {
            attributeKey: "x",
            dataType: "NUMBER",
            operator,
            buyerValue,
            requirementType: "HARD",
            weight: 10,
            listingValue,
          },
        ],
      });

    it("GTE passes when listing value is greater than or equal to buyer value", () => {
      expect(evalOne("GTE", "3", "3").hardFailed).toBe(false);
      expect(evalOne("GTE", "3", "2").hardFailed).toBe(true);
    });

    it("IN passes when the listing value is one of the buyer's accepted values", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "propertyType",
            dataType: "ENUM",
            operator: "IN",
            buyerValue: JSON.stringify(["duplex", "bungalow"]),
            requirementType: "HARD",
            weight: 10,
            listingValue: "Bungalow",
          },
        ],
      });
      expect(result.hardFailed).toBe(false);
    });

    it("CONTAINS passes when the listing's multi-select includes the buyer's required value", () => {
      const result = evaluateMatch({
        requirements: [
          {
            attributeKey: "amenities",
            dataType: "MULTI_ENUM",
            operator: "CONTAINS",
            buyerValue: "parking",
            requirementType: "HARD",
            weight: 10,
            listingValue: JSON.stringify(["wifi", "parking", "pool"]),
          },
        ],
      });
      expect(result.hardFailed).toBe(false);
    });
  });
});
