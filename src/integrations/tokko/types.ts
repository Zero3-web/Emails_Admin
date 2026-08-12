import type { Property } from "@/src/domain/types";
export interface PropertyProvider {
  getProperties(): Promise<Property[]>;
}
