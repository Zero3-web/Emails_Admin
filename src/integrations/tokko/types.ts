import type { Property } from "@/src/domain/types";
export interface PropertyProvider {
  getProperties(options?: { limit?: number; offset?: number }): Promise<Property[]>;
}
