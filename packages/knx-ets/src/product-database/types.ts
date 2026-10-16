export interface EtsProductCatalogItem {
  id: string;
  manufacturerId: string;
  name?: string;
  number?: string;
  productRefId?: string;
  hardware2ProgramRefId?: string;
  orderNumber?: string;
  productText?: string;
  applicationProgramRefs: string[];
}

export interface EtsProductDatabaseManufacturer {
  id: string;
  catalogItems: EtsProductCatalogItem[];
}

export interface EtsProductDatabaseIndex {
  schemaVersion: 1;
  manufacturers: EtsProductDatabaseManufacturer[];
  applicationProgramIds: string[];
}
