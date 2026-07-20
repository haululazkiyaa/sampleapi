const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Student = require("../src/models/Student");

async function migrate() {
  await connectDatabase();

  const statusBackfill = await Student.updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }] },
    { $set: { status: "active" } },
  );

  await Student.createIndexes();

  console.log(
    `Migration complete: ${statusBackfill.modifiedCount} students backfilled; indexes ensured.`,
  );
}

migrate()
  .catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
