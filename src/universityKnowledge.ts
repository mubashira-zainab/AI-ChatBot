export interface UniversityKnowledge {
  name: string;
  tagline: string;
  founded: number;
  campusType: string;
  studentBody: number;
  colors: { primary: string; secondary: string };
  contacts: Record<string, { email: string; phone: string; location: string }>;
  academicCalendar: {
    fallSemester: { dates: string; addDrop: string; finals: string };
    springSemester: { dates: string; addDrop: string; break: string; finals: string };
    summerTerm: { dates: string };
  };
  colleges: Array<{
    name: string;
    code: string;
    popularPrograms: string[];
  }>;
  admissions: {
    deadlines: Record<string, string>;
    requirementsUndergrad: string[];
    requirementsGrad: string[];
    internationalInfo: string[];
  };
  gradingAndPolicies: {
    gpaScale: Record<string, number>;
    deansListCriteria: string;
    probationThreshold: string;
    standardCreditLoad: string;
  };
  scholarships: Array<{
    name: string;
    amount: string;
    eligibility: string;
  }>;
  facilities: Array<{
    name: string;
    hours: string;
    features: string;
  }>;
}

export const UNIVERSITY_KNOWLEDGE: UniversityKnowledge = {
  name: "Metropolitan State University",
  tagline: "Inspiring Innovation, Discovery, and Global Leadership",
  founded: 1968,
  campusType: "Urban Research University (Tier 1)",
  studentBody: 24500,
  colors: {
    primary: "#14213D",
    secondary: "#2563EB",
  },
  contacts: {
    admissions: {
      email: "admissions@metrouniversity.edu",
      phone: "+1 (555) 019-2830",
      location: "Student Services Pavilion, Suite 101",
    },
    registrar: {
      email: "registrar@metrouniversity.edu",
      phone: "+1 (555) 019-2831",
      location: "Admin Tower, 2nd Floor",
    },
    financialAid: {
      email: "finaid@metrouniversity.edu",
      phone: "+1 (555) 019-2835",
      location: "Student Services Pavilion, Suite 108",
    },
    academicAdvising: {
      email: "advising@metrouniversity.edu",
      phone: "+1 (555) 019-2840",
      location: "University Learning Center, Room 220",
    },
    internationalOffice: {
      email: "iso@metrouniversity.edu",
      phone: "+1 (555) 019-2850",
      location: "Global Education Hall, Room 304",
    },
    careerServices: {
      email: "careers@metrouniversity.edu",
      phone: "+1 (555) 019-2860",
      location: "Founders Hall, Ground Floor",
    },
    campusHealth: {
      email: "healthcenter@metrouniversity.edu",
      phone: "+1 (555) 019-2870",
      location: "Wellness Center, North Campus",
    },
    campusPolice: {
      email: "campuspolice@metrouniversity.edu",
      phone: "+1 (555) 019-SAFE (7233)",
      location: "Public Safety Headquarters (24/7)",
    },
  },
  academicCalendar: {
    fallSemester: {
      dates: "Late August to Mid-December",
      addDrop: "First 14 calendar days of the semester",
      finals: "Second week of December",
    },
    springSemester: {
      dates: "Mid-January to Mid-May",
      addDrop: "First 14 calendar days of the semester",
      break: "Third week of March",
      finals: "Second week of May",
    },
    summerTerm: {
      dates: "June 1 to July 25 (Accelerated 8-week session)",
    },
  },
  colleges: [
    {
      name: "College of Computing, AI & Data Science",
      code: "CCDS",
      popularPrograms: [
        "B.S. in Computer Science",
        "B.S. in Artificial Intelligence & Machine Learning",
        "B.S. in Cybersecurity & Network Engineering",
        "M.S. in Data Science & Analytics",
        "Ph.D. in Computer Science",
      ],
    },
    {
      name: "College of Engineering & Applied Technology",
      code: "CEAT",
      popularPrograms: [
        "B.S. in Mechanical Engineering",
        "B.S. in Electrical & Computer Engineering",
        "B.S. in Biomedical Engineering",
        "B.S. in Robotics and Mechatronics",
        "M.S. in Sustainable Infrastructure",
      ],
    },
    {
      name: "School of Business & Economics",
      code: "SBE",
      popularPrograms: [
        "B.B.A. in Finance & Investment Banking",
        "B.B.A. in Digital Marketing & Analytics",
        "B.B.A. in International Business",
        "Full-Time and Professional M.B.A.",
        "M.S. in Financial Technology (FinTech)",
      ],
    },
    {
      name: "College of Health, Medicine & Life Sciences",
      code: "CHLS",
      popularPrograms: [
        "B.S. in Nursing (BSN)",
        "B.S. in Molecular Biology & Genetics",
        "B.S. in Neuroscience",
        "Pre-Medical & Pre-Health Track",
        "Master of Public Health (MPH)",
      ],
    },
    {
      name: "College of Humanities, Social Sciences & Law",
      code: "CHSL",
      popularPrograms: [
        "B.A. in Psychology & Cognitive Science",
        "B.A. in Media, Journalism & Digital Communications",
        "B.A. in International Relations & Diplomacy",
        "Pre-Law Advisory Program",
        "Master of Public Policy (MPP)",
      ],
    },
  ],
  admissions: {
    deadlines: {
      undergradEarlyAction: "November 1",
      undergradRegularDecision: "January 15",
      transferFall: "March 15",
      transferSpring: "October 15",
      graduatePriority: "February 1",
    },
    requirementsUndergrad: [
      "Completed Common Application or Metro Direct Online Portal",
      "Official high school transcripts (Recommended unweighted GPA 3.2+)",
      "Test-Optional Policy (SAT/ACT submissions accepted but not mandatory)",
      "Personal statement / essay (500-650 words)",
      "Two letters of recommendation (counselor and academic teacher)",
      "Application fee ($65, fee waivers available for eligible students)",
    ],
    requirementsGrad: [
      "Conferred Bachelor's degree from an accredited institution with minimum 3.0 GPA",
      "Official undergraduate academic transcripts",
      "Statement of Purpose detailing research or professional ambitions",
      "3 academic or professional recommendation letters",
      "Updated Curriculum Vitae (CV) or Resume",
      "Program-specific portfolio or GRE/GMAT (check department requirements)",
    ],
    internationalInfo: [
      "English Proficiency: Minimum TOEFL iBT 80, IELTS 6.5, or Duolingo 115",
      "Official transcript evaluation via WES, ECE, or SpanTran",
      "Form I-20 and F-1 Student Visa support issued upon admitted enrollment confirmation",
      "Dedicated International Student Orientation week before semester start",
    ],
  },
  gradingAndPolicies: {
    gpaScale: {
      A: 4.0,
      "A-": 3.7,
      "B+": 3.3,
      B: 3.0,
      "B-": 2.7,
      "C+": 2.3,
      C: 2.0,
      "C-": 1.7,
      D: 1.0,
      F: 0.0,
    },
    deansListCriteria:
      "Term GPA of 3.60 or higher with a minimum of 12 letter-graded credits and no incomplete grades.",
    probationThreshold:
      "A cumulative GPA falling below 2.00 triggers academic probation for one semester. Dedicated learning counseling is assigned.",
    standardCreditLoad:
      "Full-time status is 12-18 credits per semester (typically 4-5 courses). 15 credits is recommended for a 4-year graduation timeline.",
  },
  scholarships: [
    {
      name: "Presidential Honors Fellowship",
      amount: "Full Tuition + $3,000 Annual Living Stipend",
      eligibility:
        "High school seniors with exceptional academic merit (3.9+ GPA) and demonstrated leadership.",
    },
    {
      name: "Dean's Merit Excellence Award",
      amount: "$8,000 per year (Renewable for 4 years)",
      eligibility:
        "Incoming freshmen with 3.5+ cumulative GPA; automatically reviewed upon admission application.",
    },
    {
      name: "Metro STEM Innovation Grant",
      amount: "$6,500 per year",
      eligibility:
        "Undergraduate students majoring in Computer Science, AI, Robotics, or Biomedical Engineering.",
    },
    {
      name: "Global Scholar Cultural Grant",
      amount: "$5,000 per year",
      eligibility:
        "International students demonstrating strong academic promise and community service.",
    },
    {
      name: "Graduate Research & Teaching Assistantships",
      amount: "Full Tuition Remission + Bi-Weekly Living Stipend",
      eligibility:
        "Admitted Master's and Doctoral candidates participating in faculty research labs or department labs.",
    },
  ],
  facilities: [
    {
      name: "Founders Memorial Library",
      hours: "24/7 access during active semester (Student badge required after 10 PM)",
      features:
        "6 floors, 65 reservable quiet group study rooms, 3D printing & VR makerspace, silent study zones on floors 4-6, café on ground floor.",
    },
    {
      name: "Metro Recreation & Aquatic Complex",
      hours: "Monday - Sunday: 6:00 AM - 11:00 PM",
      features:
        "Olympic-size pool, indoor 200m track, 4 basketball courts, rock climbing wall, modern cardio/weight suites, free group fitness classes.",
    },
    {
      name: "Student Innovation & Tech Commons",
      hours: "Monday - Friday: 8:00 AM - Midnight | Weekends: 10:00 AM - 10:00 PM",
      features:
        "Hardware lending lab, cloud compute workstations, free software helpdesk (MATLAB, Python, Adobe Cloud), presentation rehearsal suites.",
    },
    {
      name: "University Dining Commons & Food Hall",
      hours: "7:00 AM - 10:00 PM Daily",
      features:
        "4 full-service dining halls featuring certified halal, kosher, vegan, gluten-free, and farm-to-table allergen-free stations.",
    },
    {
      name: "Campus Health & Psychological Wellness Hub",
      hours: "Monday - Friday: 8:00 AM - 6:00 PM (24/7 Crisis Helpline Available)",
      features:
        "Primary care, immunizations, sports medicine, free confidential mental health counseling, meditation and sensory decompression rooms.",
    },
  ],
};
