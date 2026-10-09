const fs = require("fs");
const path = require("path");
const { Document, Packer } = require("docx");
const { titlePage, q1 } = require("./build_assignment3");
const q2 = require("./q2");
const q3 = require("./q3");
const q4 = require("./q4");
const q5 = require("./q5");

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [...titlePage, ...q1, ...q2, ...q3, ...q4, ...q5],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "ISJ107V_Assignment_3_Draft_v2.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Written to", outPath);
});
