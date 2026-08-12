import { properties } from "@/src/data/mock"; import type { PropertyProvider } from "./types"; export class MockTokkoProvider implements PropertyProvider{async getProperties(){return properties}}
