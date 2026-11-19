import { Document } from 'coedit';

const doc = new Document({ type: 'text' });
doc.insert(0, 'fn main() {\n  println!("hello");\n}\n');
console.log(doc.length);
