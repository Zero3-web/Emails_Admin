import { posts } from "@/src/data/mock";
import type { Site } from "@/src/domain/types";
import type { BlogProvider } from "./types";
export class MockWordPressProvider implements BlogProvider {
  async getPosts(site: Site) {
    return posts.filter((p) => p.siteId === site.id);
  }
}
