# Sample API Mahasiswa

REST API berbasis Node.js, Express, dan MongoDB. Seluruh endpoint mahasiswa
memerlukan header `Authorization: Bearer <token>`.

## Menjalankan Project

```bash
npm install
cp .env.example .env
npm run dev
```

Base URL: `http://localhost:3000/api/v1`

Migrasikan data lama dan pastikan index database tersedia, lalu isi 50 data
mahasiswa deterministik:

```bash
npm run db:migrate
npm run db:seed
```

Kedua perintah aman dijalankan ulang. Seeder melakukan upsert menggunakan NIM
berawalan `SEED2026`, sehingga tidak membuat duplikasi.

## Format Response

Response sukses selalu memiliki `success`, `code`, `message`, dan `data`.
Endpoint koleksi dapat menambahkan `meta`.

```json
{
  "success": true,
  "code": 200,
  "message": "Student fetched successfully",
  "data": {}
}
```

Error input menggunakan bentuk berikut. `field` menunjukkan lokasi input yang
gagal, termasuk indeks item untuk operasi bulk.

```json
{
  "success": false,
  "code": 422,
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address"
    }
  ]
}
```

Status error utama:

| Status | Arti |
|---|---|
| `400` | Format parameter tidak dapat diproses oleh database |
| `401` | Bearer token tidak ada, tidak valid, atau kedaluwarsa |
| `404` | Mahasiswa tidak ditemukan |
| `409` | Nilai unik duplikat atau transisi status tidak diperbolehkan |
| `422` | Body, query, atau path parameter gagal divalidasi |
| `500` | Kesalahan internal yang tidak terduga |

## Enam Endpoint Utama

### 1. Detail mahasiswa (mudah)

```http
GET /students/:id
```

`id` harus berupa MongoDB ObjectId 24 karakter hexadecimal. Menghasilkan `404`
jika format valid tetapi data tidak ditemukan.

### 2. Membuat mahasiswa (mudah)

```http
POST /students
Content-Type: application/json
```

```json
{
  "nim": "20260001",
  "name": "Alya Putri",
  "email": "alya@example.com",
  "major": "Informatics",
  "semester": 2,
  "gpa": 3.72,
  "birthDate": "2007-03-12"
}
```

`nim` dan `email` harus unik. `semester` berada pada rentang 1-14, `gpa` pada
rentang 0-4, dan `birthDate` memakai format `YYYY-MM-DD`. Berhasil dengan `201`.

### 3. Daftar mahasiswa (sedang)

```http
GET /students?page=1&limit=20&search=alya&major=Informatics&semester=2&gpaMin=3&gpaMax=4&status=active&sortBy=gpa&sortOrder=desc
```

| Query | Tipe dan aturan | Default |
|---|---|---|
| `page` | Integer, minimal 1 | `1` |
| `limit` | Integer 1-100 | `10` |
| `search` | String 1-120 karakter | - |
| `major` | String 2-120 karakter, exact case-insensitive | - |
| `semester` | Integer 1-14 | - |
| `gpaMin`, `gpaMax` | Angka 0-4; minimum tidak boleh melebihi maksimum | - |
| `status` | `active`, `inactive`, `graduated`, `dropped_out` | - |
| `sortBy` | `name`, `nim`, `gpa`, `semester`, `createdAt` | `createdAt` |
| `sortOrder` | `asc` atau `desc` | `desc` |

Response menyertakan metadata pagination: `totalItems`, `totalPages`,
`hasNextPage`, dan `hasPrevPage`.

### 4. Mengubah status mahasiswa (sedang)

```http
PATCH /students/:id/status
Content-Type: application/json
```

```json
{
  "status": "inactive",
  "reason": "academic leave"
}
```

`reason` wajib untuk status `inactive` dan `dropped_out`. Transisi yang diizinkan:

| Status awal | Status tujuan |
|---|---|
| `active` | `inactive`, `graduated`, `dropped_out` |
| `inactive` | `active`, `dropped_out` |
| `graduated` | Tidak ada (terminal) |
| `dropped_out` | Tidak ada (terminal) |

Status yang sama atau transisi terlarang menghasilkan `409`.

### 5. Bulk upsert mahasiswa (kompleks)

```http
POST /students/bulk-upsert
Content-Type: application/json
```

```json
{
  "matchBy": "nim",
  "mode": "partial",
  "students": [
    {
      "nim": "20260001",
      "name": "Alya Putri",
      "email": "alya@example.com",
      "major": "Informatics",
      "semester": 2,
      "gpa": 3.72
    }
  ]
}
```

- `matchBy`: `nim` atau `email`; menentukan field pencocokan upsert.
- `mode`: `partial` atau `atomic`; default `partial`.
- `students`: 1-100 item dengan aturan field yang sama seperti create.
- `partial`: item valid tetap diproses dan kegagalan dilaporkan per indeks.
- `atomic`: seluruh batch dijalankan dalam transaksi MongoDB. Satu kegagalan
  membatalkan semua perubahan dan deployment harus mendukung transactions
  (replica set atau sharded cluster).

Contoh hasil mode partial:

```json
{
  "success": true,
  "code": 200,
  "message": "Partial bulk operation completed",
  "data": {
    "summary": { "received": 2, "created": 1, "updated": 0, "failed": 1 },
    "results": [
      { "index": 0, "status": "created", "studentId": "..." },
      {
        "index": 1,
        "status": "failed",
        "errors": [{ "field": "email", "message": "Invalid email address" }]
      }
    ]
  }
}
```

### 6. Analytics mahasiswa (kompleks)

```http
GET /students/analytics?major=Informatics&semesterFrom=2&semesterTo=8&gpaMin=2.5&status=active&groupBy=semester
```

`groupBy` menerima `major`, `semester`, atau `status`. Filter `major`, `status`,
rentang semester, dan rentang GPA bersifat opsional. Batas bawah tidak boleh
lebih besar daripada batas atas.

Response memuat:

- `summary`: total mahasiswa serta GPA rata-rata, tertinggi, dan terendah.
- `distribution`: jumlah dan rata-rata GPA berdasarkan `groupBy`.
- `statusBreakdown`: jumlah mahasiswa per status setelah filter diterapkan.
- `meta`: filter efektif dan grouping yang digunakan.

Dataset kosong tetap menghasilkan `200`, dengan `totalStudents: 0`, nilai GPA
`null`, dan distribusi kosong.

## Endpoint Pendukung

Endpoint lama berikut tetap tersedia tetapi tidak termasuk enam endpoint utama:

- `PUT /students/:id`
- `DELETE /students/:id`
- `POST /auth/register`
- `POST /auth/login`
- `GET /health`

## Pengujian

```bash
npm test
```
