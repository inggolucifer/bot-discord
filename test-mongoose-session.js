const mongoose = require('mongoose');

async function run() {
  const schema = new mongoose.Schema({ name: String });
  const Model = mongoose.model('Test', schema);

  try {
    let query = Model.findOne({}).session(null);
    console.log("query.session(null) works");
  } catch (e) {
    console.error("query.session(null) failed", e);
  }
}
run();
