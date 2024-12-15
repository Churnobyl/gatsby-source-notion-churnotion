import type {
  ActionOptions,
  ActionPlugin,
  Actions,
  GatsbyCache,
  PluginOptions as GatsbyDefaultPluginOptions,
  IPluginRefOptions,
  Node,
  NodeInput,
  Reporter,
} from "gatsby";
import { MdBlock } from "notion-to-md/build/types";

export interface IPost extends Node {
  id: string;
  category: tags;
  tags: string[];
  book: IBook;
  book_index: number;
  title: string;
  content: MdBlock[];
  create_date: Date;
  update_date: Date;
  version: number;
  description: string | null;
  slug: string;
  category_list: ICategory[];
  internal: Node.Internal;
  children: [];
  url: string;
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
}

export interface IBook extends Node {
  id: string;
  book_name: string;
  create_date: Date;
  update_date: Date;
  internal: Node.Internal;
  url: string;
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
}

export interface IGetBooksParams {
  bookDatabaseId: string;
  reporter: Reporter;
  createNode: (
    this: void,
    node: NodeInput,
    plugin?: ActionPlugin,
    options?: ActionOptions
  ) => void | Promise<void>;
  createNodeId: (this: void, input: string) => string;
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
