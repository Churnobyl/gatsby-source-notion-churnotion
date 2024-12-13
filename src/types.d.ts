import type {
  ActionOptions,
  ActionPlugin,
  Actions,
  GatsbyCache,
  PluginOptions as GatsbyDefaultPluginOptions,
  IPluginRefOptions,
  NodeInput,
  Reporter,
} from "gatsby";

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
