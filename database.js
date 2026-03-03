/**
 * SQLite database for GYANGANGA Education
 * Tables: colleges, courses
 */

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data", "gyanganga.db");
const db = new Database(dbPath);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'offline',
      best_feature TEXT,
      image_url TEXT,
      description TEXT,
      image_gallery TEXT,
      rating REAL DEFAULT 4.5,
      reviews_count INTEGER DEFAULT 0,
      admission_status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration TEXT NOT NULL,
      total_fees INTEGER NOT NULL,
      best_feature TEXT,
      features TEXT,
      location TEXT,
      specialization TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id)
    );
    
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      course_id INTEGER,
      student_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER,
      course_id INTEGER,
      name TEXT NOT NULL,
      course_level TEXT NOT NULL,
      location TEXT,
      phone TEXT NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_college ON courses(college_id);
    CREATE INDEX IF NOT EXISTS idx_courses_fees ON courses(total_fees);
    CREATE INDEX IF NOT EXISTS idx_colleges_mode ON colleges(mode);
  `);
  
  // Migration: Add extra columns/tables if they don't exist
  try {
    const info = db.prepare("PRAGMA table_info(courses)").all();
    const hasLocation = info.some((col) => col.name === "location");
    const hasSpecialization = info.some((col) => col.name === "specialization");
    
    if (!hasLocation) {
      db.exec("ALTER TABLE courses ADD COLUMN location TEXT");
      console.log("Added location column to courses table");
      
      // Update existing courses: set location based on college mode
      const updateStmt = db.prepare(`
        UPDATE courses 
        SET location = CASE 
          WHEN (SELECT mode FROM colleges WHERE colleges.id = courses.college_id) = 'online' 
          THEN 'Remote' 
          ELSE (SELECT location FROM colleges WHERE colleges.id = courses.college_id)
        END
        WHERE location IS NULL
      `);
      const result = updateStmt.run();
      if (result.changes > 0) {
        console.log(`Updated location for ${result.changes} existing courses`);
      }
    }
    
    if (!hasSpecialization) {
      db.exec("ALTER TABLE courses ADD COLUMN specialization TEXT");
      console.log("Added specialization column to courses table");
    }
  } catch (err) {
    console.error("Migration error:", err.message);
  }

  try {
    const info = db.prepare("PRAGMA table_info(courses)").all();
    const hasFeatures = info.some((col) => col.name === "features");
    if (!hasFeatures) {
      db.exec("ALTER TABLE courses ADD COLUMN features TEXT");
      console.log("Added features column to courses table");
      // Migrate best_feature to features (JSON array)
      db.exec(`
        UPDATE courses 
        SET features = CASE 
          WHEN best_feature IS NOT NULL AND best_feature != '' 
          THEN '["' || best_feature || '"]'
          ELSE '[]'
        END
        WHERE features IS NULL
      `);
    }
  } catch (err) {
    // Column might already exist, ignore
    console.error("Migration error:", err.message);
  }

  try {
    const collegeInfo = db.prepare("PRAGMA table_info(colleges)").all();
    const hasAdmissionStatus = collegeInfo.some((col) => col.name === "admission_status");
    const hasDescription = collegeInfo.some((col) => col.name === "description");
    const hasImageGallery = collegeInfo.some((col) => col.name === "image_gallery");
    if (!hasAdmissionStatus) {
      db.exec("ALTER TABLE colleges ADD COLUMN admission_status TEXT DEFAULT 'open'");
      console.log("Added admission_status column to colleges table");
    }
    if (!hasDescription) {
      db.exec("ALTER TABLE colleges ADD COLUMN description TEXT");
      console.log("Added description column to colleges table");
    }
    if (!hasImageGallery) {
      db.exec("ALTER TABLE colleges ADD COLUMN image_gallery TEXT");
      console.log("Added image_gallery column to colleges table");
    }
  } catch (err) {
    console.error("Migration error:", err.message);
  }
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) as c FROM colleges").get();
  if (count.c > 0) return;

  const offlineColleges = [
    { name: "Indian Institute of Management Ahmedabad", location: "Ahmedabad", type: "Government", mode: "offline", best_feature: "Top IIM, Best Placements in India", image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80" },
    { name: "Indian Institute of Management Bangalore", location: "Bangalore", type: "Government", mode: "offline", best_feature: "Premier B-School, Strong Alumni Network", image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80" },
    { name: "Indian Institute of Management Indore", location: "Indore", type: "Government", mode: "offline", best_feature: "IIM Brand, Affordable MBA", image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80" },
    { name: "IIT Delhi", location: "Delhi", type: "Government", mode: "offline", best_feature: "IIT Tag, Top Engineering College", image_url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80" },
    { name: "BITS Pilani", location: "Rajasthan", type: "Private", mode: "offline", best_feature: "Deemed University, Excellent Placements", image_url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80" },
    { name: "Delhi University (FMS)", location: "Delhi", type: "Government", mode: "offline", best_feature: "DU Affiliation, Affordable MBA", image_url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80" },
    { name: "Jamia Millia Islamia", location: "Delhi", type: "Government", mode: "offline", best_feature: "Central University, Low Fees", image_url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80" },
    { name: "NMIMS Mumbai", location: "Mumbai", type: "Private", mode: "offline", best_feature: "Deemed University, Mumbai Campus", image_url: "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=600&q=80" },
    { name: "Symbiosis International University", location: "Pune", type: "Private", mode: "offline", best_feature: "NAAC A, Multiple Specializations", image_url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80" },
    { name: "AIIMS Delhi", location: "Delhi", type: "Government", mode: "offline", best_feature: "Top Medical College, Government Funded", image_url: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=600&q=80" },
  ];

  const onlineColleges = [
    { name: "IGNOU", location: "Delhi", type: "Government", mode: "online", best_feature: "Government University, Most Affordable", image_url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80" },
    { name: "Amity University Online", location: "Noida", type: "Private", mode: "online", best_feature: "UGC-DEB Approved, Flexible Learning", image_url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80" },
    { name: "Manipal University Online", location: "Manipal", type: "Private", mode: "online", best_feature: "NAAC A++, Industry Recognized", image_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80" },
    { name: "NMIMS Online", location: "Mumbai", type: "Private", mode: "online", best_feature: "NMIMS Brand, Online MBA", image_url: "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=600&q=80" },
    { name: "LPU Online", location: "Punjab", type: "Private", mode: "online", best_feature: "NAAC A+, Affordable Online Degrees", image_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80" },
  ];

  const offlineCourses = [
    [1, "MBA", "2 Years", 3300000, "Top IIM Placements", "Finance"],
    [1, "Executive MBA", "1 Year", 3100000, "Executive Program for Working Professionals", "General Management"],
    [2, "MBA", "2 Years", 2600000, "IIM Bangalore Brand", "Marketing"],
    [2, "Executive MBA", "1 Year", 2900000, "One Year Executive MBA", "Strategy"],
    [3, "MBA", "2 Years", 2100000, "IIM Indore Affordable Option", "Operations"],
    [4, "B.Tech", "4 Years", 1000000, "IIT Delhi Engineering", "Computer Science"],
    [4, "M.Tech", "2 Years", 300000, "IIT Delhi Post Graduate", "Data Science"],
    [4, "MBA", "2 Years", 1100000, "IIT Delhi MBA", "Technology Management"],
    [5, "B.Tech", "4 Years", 2400000, "BITS Pilani Engineering", "Electronics"],
    [5, "M.Tech", "2 Years", 1000000, "BITS Pilani M.Tech", "Software Engineering"],
    [5, "MBA", "2 Years", 1800000, "BITS Pilani MBA", "IT Management"],
    [6, "MBA", "2 Years", 230000, "FMS Delhi Affordable MBA", "Finance"],
    [7, "MBA", "2 Years", 150000, "Jamia MBA Low Fees", "Marketing"],
    [7, "B.Tech", "4 Years", 65000, "Jamia B.Tech Very Affordable", "Mechanical"],
    [8, "MBA", "2 Years", 2200000, "NMIMS Mumbai MBA", "Finance"],
    [8, "BBA", "3 Years", 900000, "NMIMS BBA", "General"],
    [9, "MBA", "2 Years", 2000000, "Symbiosis MBA", "Marketing"],
    [9, "BBA", "3 Years", 750000, "Symbiosis BBA", "General"],
    [10, "MBBS", "5.5 Years", 15000, "AIIMS MBBS Government Funded", "General Medicine"],
    [10, "B.Sc Nursing", "4 Years", 8000, "AIIMS Nursing", "Nursing"],
  ];

  const onlineCourses = [
    [11, "Online MBA", "2 Years", 62000, "IGNOU Most Affordable Online MBA", "Finance"],
    [11, "Online BBA", "3 Years", 30000, "IGNOU Online BBA", "General"],
    [12, "Online MBA", "2 Years", 199000, "Amity Online MBA UGC Approved", "Marketing"],
    [12, "Online BBA", "3 Years", 165000, "Amity Online BBA", "General"],
    [13, "Online MBA", "2 Years", 175000, "Manipal Online MBA", "Finance"],
    [13, "Online BBA", "3 Years", 135000, "Manipal Online BBA", "General"],
    [14, "Online MBA", "2 Years", 196000, "NMIMS Online MBA", "Finance"],
    [14, "Online BBA", "3 Years", 140000, "NMIMS Online BBA", "General"],
    [15, "Online MBA", "2 Years", 146000, "LPU Online MBA", "Marketing"],
    [15, "Online BCA", "3 Years", 120000, "LPU Online BCA", "Computer Applications"],
  ];

  const insertCollege = db.prepare(
    "INSERT INTO colleges (name, location, type, mode, best_feature, image_url) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertCourse = db.prepare(
    "INSERT INTO courses (college_id, name, duration, total_fees, best_feature, location, specialization) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const trans = db.transaction(() => {
    // Insert offline colleges (will get IDs 1-10)
    offlineColleges.forEach((c) => {
      insertCollege.run(c.name, c.location, c.type, c.mode, c.best_feature, c.image_url);
    });
    // Insert online colleges (will get IDs 11-15)
    onlineColleges.forEach((c) => {
      insertCollege.run(c.name, c.location, c.type, c.mode, c.best_feature, c.image_url);
    });
    
    // Insert offline courses with college location and specialization
    offlineCourses.forEach(([cid, name, dur, fees, bf, spec]) => {
      const college = offlineColleges[cid - 1]; // cid 1-10 map to indices 0-9
      const location = college ? college.location : "Delhi";
      insertCourse.run(cid, name, dur, fees, bf, location, spec);
    });
    // Insert online courses with "Remote" location and specialization
    onlineCourses.forEach(([cid, name, dur, fees, bf, spec]) => {
      insertCourse.run(cid, name, dur, fees, bf, "Remote", spec);
    });
  });
  trans();
  console.log("Database seeded with initial data.");
}

initDb();
seedIfEmpty();

module.exports = db;
