const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getStudentsQuerySchema,
  updateStudentStatusSchema,
  bulkUpsertStudentSchema,
  analyticsQuerySchema,
  studentFieldsSchema,
} = require("../src/validators/studentValidator");

const validStudent = {
  nim: "20260001",
  name: "Alya Putri",
  email: "ALYA@example.com",
  major: "Informatics",
  semester: 2,
  gpa: 3.72,
};

test("student input normalizes email", () => {
  const result = studentFieldsSchema.parse(validStudent);
  assert.equal(result.email, "alya@example.com");
});

test("list query coerces values and rejects an inverted GPA range", () => {
  const valid = getStudentsQuerySchema.parse({
    query: { page: "2", limit: "20", gpaMin: "3", gpaMax: "4" },
  });
  assert.equal(valid.query.page, 2);
  assert.equal(valid.query.gpaMin, 3);

  const invalid = getStudentsQuerySchema.safeParse({
    query: { gpaMin: "4", gpaMax: "3" },
  });
  assert.equal(invalid.success, false);
});

test("inactive and dropped-out statuses require a reason", () => {
  for (const status of ["inactive", "dropped_out"]) {
    const result = updateStudentStatusSchema.safeParse({ body: { status } });
    assert.equal(result.success, false);
  }

  assert.equal(
    updateStudentStatusSchema.safeParse({ body: { status: "graduated" } }).success,
    true,
  );
});

test("bulk request enforces mode, match field, and item count", () => {
  const valid = bulkUpsertStudentSchema.safeParse({
    body: { mode: "partial", matchBy: "nim", students: [validStudent] },
  });
  assert.equal(valid.success, true);

  const empty = bulkUpsertStudentSchema.safeParse({
    body: { mode: "partial", matchBy: "nim", students: [] },
  });
  assert.equal(empty.success, false);
});

test("analytics rejects inverted semester and GPA ranges", () => {
  const semester = analyticsQuerySchema.safeParse({
    query: { semesterFrom: "8", semesterTo: "2" },
  });
  const gpa = analyticsQuerySchema.safeParse({
    query: { gpaMin: "3.8", gpaMax: "2.5" },
  });
  assert.equal(semester.success, false);
  assert.equal(gpa.success, false);
});
