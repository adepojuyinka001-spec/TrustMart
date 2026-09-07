import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { CreateSubcategoryDto } from "./dto/create-subcategory.dto";
import type { CreateAttributeDefinitionDto } from "./dto/create-attribute-definition.dto";
import type { LinkCategoryAttributeDto } from "./dto/link-category-attribute.dto";

// Admin-configurable Category -> Subcategory -> Dynamic Attribute engine
// (Blueprint SS6). Never hard-code per-industry logic here — the same
// Listing/BuyerRequest/Matching code works for any category via this metadata.
@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createCategory(dto: CreateCategoryDto, actorId: string, ipAddress?: string) {
    const category = await this.prisma.category.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: "category.create",
      resourceType: "Category",
      resourceId: category.id,
      afterState: category,
      ipAddress,
    });
    return category;
  }

  async createSubcategory(categoryId: string, dto: CreateSubcategoryDto, actorId: string, ipAddress?: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    const subcategory = await this.prisma.subcategory.create({
      data: { ...dto, categoryId },
    });

    await this.auditService.record({
      actorId,
      action: "subcategory.create",
      resourceType: "Subcategory",
      resourceId: subcategory.id,
      afterState: subcategory,
      ipAddress,
    });
    return subcategory;
  }

  async createAttributeDefinition(dto: CreateAttributeDefinitionDto, actorId: string, ipAddress?: string) {
    const attribute = await this.prisma.attributeDefinition.create({
      data: {
        key: dto.key,
        label: dto.label,
        dataType: dto.dataType,
        unit: dto.unit,
        isPublic: dto.isPublic ?? true,
        options: dto.options
          ? { create: dto.options.map((option, index) => ({ ...option, displayOrder: index })) }
          : undefined,
      },
      include: { options: true },
    });

    await this.auditService.record({
      actorId,
      action: "attribute_definition.create",
      resourceType: "AttributeDefinition",
      resourceId: attribute.id,
      afterState: attribute,
      ipAddress,
    });
    return attribute;
  }

  async linkAttributeToSubcategory(
    subcategoryId: string,
    dto: LinkCategoryAttributeDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const subcategory = await this.prisma.subcategory.findUnique({ where: { id: subcategoryId } });
    if (!subcategory) {
      throw new NotFoundException("Subcategory not found.");
    }

    const link = await this.prisma.categoryAttribute.create({
      data: {
        subcategoryId,
        attributeId: dto.attributeId,
        required: dto.required ?? false,
        searchable: dto.searchable ?? true,
        filterable: dto.filterable ?? true,
        matchable: dto.matchable ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: { attribute: { include: { options: true } } },
    });

    await this.auditService.record({
      actorId,
      action: "category_attribute.link",
      resourceType: "CategoryAttribute",
      resourceId: link.id,
      afterState: link,
      ipAddress,
    });
    return link;
  }

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { subcategories: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
    });
  }

  async getSubcategoryWithAttributes(subcategoryId: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      include: {
        category: true,
        attributes: {
          orderBy: { displayOrder: "asc" },
          include: { attribute: { include: { options: true } } },
        },
      },
    });
    if (!subcategory) {
      throw new NotFoundException("Subcategory not found.");
    }
    return subcategory;
  }
}
