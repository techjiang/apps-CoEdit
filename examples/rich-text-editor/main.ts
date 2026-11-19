import { Document } from 'coedit';

const doc = new Document({ type: 'richtext' });
doc.insert(0, 'Start editing together');
console.log(doc.toString());
