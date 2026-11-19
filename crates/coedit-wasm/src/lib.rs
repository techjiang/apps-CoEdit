use coedit_core::{Document, DocumentOptions, DocumentType};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct JsDocument {
    inner: Document,
}

#[wasm_bindgen]
impl JsDocument {
    #[wasm_bindgen(constructor)]
    pub fn new(document_type: &str) -> JsDocument {
        let kind = match document_type {
            "richtext" => DocumentType::RichText,
            "json" => DocumentType::Json,
            _ => DocumentType::Text,
        };
        JsDocument { inner: Document::new(DocumentOptions { document_type: kind, encrypted: false }) }
    }

    pub fn insert(&mut self, index: usize, text: &str) -> Result<(), JsValue> {
        self.inner.insert(index, text).map_err(|err| JsValue::from_str(&err.to_string()))?;
        Ok(())
    }

    pub fn delete(&mut self, index: usize, len: usize) -> Result<(), JsValue> {
        self.inner.delete(index, len).map_err(|err| JsValue::from_str(&err.to_string()))?;
        Ok(())
    }

    pub fn to_string(&self) -> String {
        self.inner.to_string()
    }

    pub fn version(&self) -> u64 {
        self.inner.version()
    }
}
