import type {
  ActionOptions,
  ActionPlugin,
  Actions,
  GatsbyCache,
  PluginOptions as GatsbyDefaultPluginOptions,
  IPluginRefOptions,
  Node,
  NodeInput,
  PluginOptions,
  Reporter,
} from "gatsby";
import { BaseContentBlock } from "notion-types";

export interface ISourceNodesOptions extends PluginOptions {
  token: string;
  databaseId: string;
  bookDatabaseId: string;
  etriToken: string;
}

export interface CustomImageBlock extends BaseContentBlock {
  hash?: string;
  type: "image";
  image: {
    rich_text: any;
    caption: Array<{
      type: "text";
      text: {
        content: string;
        link: string | null;
      };
      plain_text: string;
      href: string | null;
    }>;
    type: "file" | "external";
    file?: {
      url: string;
      expiry_time: string;
    };
    external?: {
      url: string;
    };
    fileId?: string;
  };
}

export interface HeadingBlock extends BaseContentBlock {
  type: "heading_1" | "heading_2" | "heading_3";
  heading_1?: { rich_text: { plain_text: string }[] };
  heading_2?: { rich_text: { plain_text: string }[] };
  heading_3?: { rich_text: { plain_text: string }[] };
}

export interface IPost extends Node {
  id: string;
  category: tags;
  tags: string[];
  book: string;
  book_index: number;
  title: string;
  // content: MdBlock[];
  content: BaseContentBlock[];
  create_date: Date;
  update_date: Date;
  version: number;
  description: string | null;
  slug: string;
  category_list: ICategory[];
  internal: Node.Internal;
  children: [];
  url: string;
  thumbnail: string | null;
  rawText?: string;
}

export interface ITag extends Node {
  id: string;
  tag_name: string;
  slug: string;
  color: string;
  internal: Node.Internal;
  churnotions: string[];
  url: string;
}

export interface ICategory extends Node {
  id: string;
  parent: string | null;
  category_name: string;
  slug: string;
  internal: Node.Internal;
  children: [];
  url: string;
  books: string[];
}

export interface IBook extends Node {
  id: string;
  book_name: string;
  create_date: Date;
  update_date: Date;
  internal: Node.Internal;
  url: string;
  book_category: string | null;
}

export interface IPageFilter {
  property: string;
  value: any;
}

export interface IGetPagesOptions {
  isIncludeChildren?: boolean;
}

export interface IGetPagesParams {
  token: string;
  databaseId: string;
  pageFilter?: IPageFilter;
  option?: IGetPagesOptions;
  reporter: Reporter;
  getCache: (this: void, id: string) => GatsbyCache;
  actions: Actions;
  createNode: (
    this: void,
    node: NodeInput,
    plugin?: ActionPlugin,
    options?: ActionOptions
  ) => void | Promise<void>;
  createNodeId: (this: void, input: string) => string;
  createParentChildLink: any;
  getNode: any;
  cache: GatsbyCache;
}

export interface IGetBooksParams {
  bookDatabaseId: string;
  reporter: Reporter;
  getCache: (this: void, id: string) => GatsbyCache;
  createNode: (
    this: void,
    node: NodeInput,
    plugin?: ActionPlugin,
    options?: ActionOptions
  ) => void | Promise<void>;
  createNodeId: (this: void, input: string) => string;
  getNode: any;
  cache: GatsbyCache;
}

export interface IAuthorInput {
  id: number;
  name: string;
}

export interface IPostImageInput {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface IPostInput {
  id: number;
  slug: string;
  title: string;
  image: IPostImageInput;
  author: string;
}

interface IPluginOptionsKeys {
  // TODO: Set your plugin options here
  [key: string]: any;
}

/**
 * Gatsby expects the plugin options to be of type "PluginOptions" for gatsby-node APIs (e.g. sourceNodes)
 */
export interface IPluginOptionsInternal
  extends IPluginOptionsKeys,
    GatsbyDefaultPluginOptions {}

/**
 * These are the public TypeScript types for consumption in gatsby-config
 */
export interface IPluginOptions extends IPluginOptionsKeys, IPluginRefOptions {}
