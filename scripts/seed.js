const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Student = require("../src/models/Student");

const FIRST_NAMES = [
  "Alya",
  "Bima",
  "Citra",
  "Damar",
  "Elina",
  "Farhan",
  "Gita",
  "Hafiz",
  "Intan",
  "Jovan",
];
const LAST_NAMES = ["Putri", "Aditya", "Lestari", "Pratama", "Mahendra"];
const MAJORS = [
  "Informatics",
  "Information Systems",
  "Computer Engineering",
  "Data Science",
  "Software Engineering",
];
const STATUSES = ["active", "active", "active", "inactive", "graduated"];

function buildStudent(index) {
  const serial = String(index + 1).padStart(3, "0");
  const status = STATUSES[index % STATUSES.length];
  const semester = (index % 8) + 1;

  return {
    nim: `SEED2026${serial}`,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
    }`,
    email: `student.${serial}@seed.sampleapi.local`,
    major: MAJORS[index % MAJORS.length],
    semester,
    gpa: Number((2.5 + ((index * 13) % 151) / 100).toFixed(2)),
    birthDate: new Date(Date.UTC(2000 + (index % 7), index % 12, (index % 27) + 1)),
    status,
    statusReason: status === "inactive" ? "academic leave" : undefined,
  };
}

async function seed() {
  await connectDatabase();

  const students = Array.from({ length: 50 }, (_, index) => buildStudent(index));
  const result = await Student.bulkWrite(
    students.map((student) => ({
      updateOne: {
        filter: { nim: student.nim },
        update: { $set: student },
        upsert: true,
      },
    })),
    { ordered: true },
  );

  const seededCount = await Student.countDocuments({
    nim: { $regex: /^SEED2026/ },
  });
  const totalCount = await Student.countDocuments();

  console.log(
    `Seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${seededCount} seed records, ${totalCount} total students.`,
  );
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
