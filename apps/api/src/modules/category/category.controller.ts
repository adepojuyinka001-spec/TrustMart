import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { PermissionGuard } from "../rbac/permission.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateSubcategoryDto } from "./dto/create-subcategory.dto";
import { CreateAttributeDefinitionDto } from "./dto/create-attribute-definition.dto";
import { LinkCategoryAttributeDto } from "./dto/link-category-attribute.dto";

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Public reads: buyers and sellers need this metadata to build listings/requests.
  @Get("categories")
  listCategories() {
    return this.categoryService.listCategories();
  }

  @Get("subcategories/:id/attributes")
  getSubcategoryAttributes(@Param("id") id: string) {
    return this.categoryService.getSubcategoryWithAttributes(id);
  }

  @Post("categories")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("category:manage")
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.categoryService.createCategory(dto, user.userId, req.ip);
  }

  @Post("categories/:categoryId/subcategories")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("category:manage")
  createSubcategory(
    @Param("categoryId") categoryId: string,
    @Body() dto: CreateSubcategoryDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoryService.createSubcategory(categoryId, dto, user.userId, req.ip);
  }

  @Post("attribute-definitions")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("category:manage")
  createAttributeDefinition(
    @Body() dto: CreateAttributeDefinitionDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoryService.createAttributeDefinition(dto, user.userId, req.ip);
  }

  @Post("subcategories/:id/attributes")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("category:manage")
  linkAttribute(
    @Param("id") id: string,
    @Body() dto: LinkCategoryAttributeDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.categoryService.linkAttributeToSubcategory(id, dto, user.userId, req.ip);
  }
}
