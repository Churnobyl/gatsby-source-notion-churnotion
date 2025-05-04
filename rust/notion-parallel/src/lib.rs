#![deny(clippy::all)]

use futures::{stream, StreamExt};
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Semaphore;

#[napi]
pub struct NotionParallel {
  api_key: String,
  parallel_limit: u32,
}

#[napi(object)]
#[derive(Debug, Serialize, Deserialize)]
pub struct NotionBlockResponse {
  pub id: String,
  pub results: Vec<serde_json::Value>,
  pub has_more: Option<bool>,
  pub next_cursor: Option<String>,
}

#[napi(object)]
#[derive(Debug, Serialize, Deserialize)]
pub struct NotionPageBlocksResult {
  pub page_id: String,
  pub blocks: Vec<serde_json::Value>,
}

#[napi]
impl NotionParallel {
  #[napi(constructor)]
  pub fn new(api_key: String, parallel_limit: Option<u32>) -> Self {
    Self {
      api_key,
      parallel_limit: parallel_limit.unwrap_or(5),
    }
  }

  #[napi]
  pub async fn get_multiple_pages_blocks(
    &self,
    page_ids: Vec<String>,
  ) -> napi::Result<HashMap<String, Vec<serde_json::Value>>> {
    let client = reqwest::Client::new();
    let client = Arc::new(client);
    let api_key = Arc::new(self.api_key.clone());
    
    // Use a semaphore to limit concurrent requests
    let semaphore = Arc::new(Semaphore::new(self.parallel_limit as usize));
    
    let results: Vec<NotionPageBlocksResult> = stream::iter(page_ids)
      .map(|page_id| {
        let client = client.clone();
        let api_key = api_key.clone();
        let semaphore = semaphore.clone();
        
        async move {
          // Acquire a permit from the semaphore before making the request
          let _permit = semaphore.acquire().await.expect("Failed to acquire semaphore permit");
          
          match self.get_page_blocks_with_client(&client, &api_key, &page_id).await {
            Ok(blocks) => NotionPageBlocksResult {
              page_id: page_id.clone(),
              blocks,
            },
            Err(e) => {
              eprintln!("Error fetching blocks for page {}: {:?}", page_id, e);
              NotionPageBlocksResult {
                page_id: page_id.clone(),
                blocks: vec![],
              }
            }
          }
        }
      })
      .buffer_unordered(self.parallel_limit as usize)
      .collect()
      .await;

    // Convert results to HashMap
    let mut result_map = HashMap::new();
    for result in results {
      result_map.insert(result.page_id, result.blocks);
    }

    Ok(result_map)
  }

  async fn get_page_blocks_with_client(
    &self,
    client: &reqwest::Client,
    api_key: &str,
    page_id: &str,
  ) -> anyhow::Result<Vec<serde_json::Value>> {
    let mut all_blocks = Vec::new();
    let mut has_more = true;
    let mut next_cursor: Option<String> = None;

    while has_more {
      let url = format!(
        "https://api.notion.com/v1/blocks/{}/children?page_size=100{}",
        page_id,
        next_cursor
          .as_ref()
          .map(|cursor| format!("&start_cursor={}", cursor))
          .unwrap_or_default()
      );

      let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Notion-Version", "2022-06-28")
        .send()
        .await?
        .json::<NotionBlockResponse>()
        .await?;

      all_blocks.extend(response.results);
      has_more = response.has_more.unwrap_or(false);
      next_cursor = response.next_cursor;

      if !has_more || next_cursor.is_none() {
        break;
      }
    }

    // Recursively fetch child blocks for blocks with children
    let all_blocks_with_children = self.fetch_child_blocks_recursive(client, api_key, all_blocks).await?;
    
    Ok(all_blocks_with_children)
  }

  async fn fetch_child_blocks_recursive(
    &self,
    client: &reqwest::Client, 
    api_key: &str,
    blocks: Vec<serde_json::Value>,
  ) -> anyhow::Result<Vec<serde_json::Value>> {
    if blocks.is_empty() {
      return Ok(blocks);
    }

    let semaphore = Arc::new(Semaphore::new(self.parallel_limit as usize));
    
    let results = stream::iter(blocks)
      .map(|mut block| {
        let client = client.clone();
        let api_key = api_key.to_string();
        let semaphore = semaphore.clone();
        let this = self.clone();
        
        async move {
          // Check if block has children
          let has_children = block["has_children"].as_bool().unwrap_or(false);
          let block_id = block["id"].as_str().unwrap_or("");
          
          if has_children && !block_id.is_empty() {
            // Acquire a permit from the semaphore
            let _permit = semaphore.acquire().await.expect("Failed to acquire semaphore permit");
            
            match this.get_page_blocks_with_client(&client, &api_key, block_id).await {
              Ok(child_blocks) => {
                // Add children to block
                if let Some(obj) = block.as_object_mut() {
                  obj.insert("children".into(), serde_json::Value::Array(child_blocks.clone()));
                  
                  // Special handling for table blocks
                  if block["type"].as_str().unwrap_or("") == "table" {
                    if let Some(table) = obj.get_mut("table") {
                      if let Some(table_obj) = table.as_object_mut() {
                        table_obj.insert("rows".into(), serde_json::Value::Array(child_blocks));
                      }
                    }
                  }
                }
              }
              Err(e) => {
                eprintln!("Error fetching child blocks for block {}: {:?}", block_id, e);
              }
            }
          }
          
          block
        }
      })
      .buffer_unordered(self.parallel_limit as usize)
      .collect::<Vec<_>>()
      .await;
    
    Ok(results)
  }

  #[napi]
  pub fn set_parallel_limit(&mut self, limit: u32) {
    self.parallel_limit = limit;
  }
}

// Clone implementation for NotionParallel
impl Clone for NotionParallel {
  fn clone(&self) -> Self {
    Self {
      api_key: self.api_key.clone(),
      parallel_limit: self.parallel_limit,
    }
  }
} 