use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FormatSpan {
    pub from: usize,
    pub to: usize,
    pub bold: bool,
    pub italic: bool,
    pub link: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct RichTextCrdt {
    pub text: String,
    pub spans: Vec<FormatSpan>,
}

impl RichTextCrdt {
    pub fn insert(&mut self, index: usize, text: &str) {
        let byte = self.text.char_indices().nth(index).map(|(i, _)| i).unwrap_or(self.text.len());
        self.text.insert_str(byte, text);
        let added = text.chars().count();
        for span in &mut self.spans {
            if span.from >= index {
                span.from += added;
            }
            if span.to > index {
                span.to += added;
            }
        }
    }

    pub fn format(&mut self, from: usize, to: usize, bold: bool, italic: bool, link: Option<String>) {
        self.spans.push(FormatSpan { from, to, bold, italic, link });
    }

    pub fn plain(&self) -> &str {
        &self.text
    }
}
