import type { BlogPost,Site } from "@/src/domain/types"; export interface BlogProvider { getPosts(site:Site):Promise<BlogPost[]> }
