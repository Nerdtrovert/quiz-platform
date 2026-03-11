-- =============================================
-- Quiz Platform — Database Schema
-- MySQL 8.0+ | Week 1
-- =============================================

CREATE DATABASE IF NOT EXISTS quiz_platform;
USE quiz_platform;

-- Table 1: Users
CREATE TABLE Users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Categories
CREATE TABLE Categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

-- Table 3: Exams
CREATE TABLE Exams (
  exam_id       INT AUTO_INCREMENT PRIMARY KEY,
  created_by    INT NOT NULL,
  category_id   INT,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  duration_mins INT NOT NULL,
  total_marks   INT NOT NULL,
  pass_marks    INT NOT NULL,
  starts_at     DATETIME,
  ends_at       DATETIME,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (category_id) REFERENCES Categories(category_id),
  CHECK (ends_at > starts_at),
  CHECK (pass_marks <= total_marks)
);

-- Table 4: Questions
CREATE TABLE Questions (
  question_id    INT AUTO_INCREMENT PRIMARY KEY,
  exam_id        INT NOT NULL,
  question_text  TEXT NOT NULL,
  correct_option TINYINT NOT NULL,
  marks          INT NOT NULL DEFAULT 1,
  negative_marks DECIMAL(4,2) DEFAULT 0.00,
  FOREIGN KEY (exam_id) REFERENCES Exams(exam_id) ON DELETE CASCADE,
  CHECK (correct_option BETWEEN 1 AND 4)
);

-- Table 5: Options
CREATE TABLE Options (
  option_id     INT AUTO_INCREMENT PRIMARY KEY,
  question_id   INT NOT NULL,
  option_number TINYINT NOT NULL,
  option_text   TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE,
  CHECK (option_number BETWEEN 1 AND 4),
  UNIQUE (question_id, option_number)
);

-- Table 6: Attempts
CREATE TABLE Attempts (
  attempt_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  exam_id      INT NOT NULL,
  started_at   DATETIME DEFAULT NOW(),
  submitted_at DATETIME,
  status       ENUM('ongoing', 'submitted') DEFAULT 'ongoing',
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (exam_id) REFERENCES Exams(exam_id),
  UNIQUE (user_id, exam_id)
);

-- Table 7: Answers
CREATE TABLE Answers (
  answer_id       INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id      INT NOT NULL,
  question_id     INT NOT NULL,
  selected_option TINYINT,
  FOREIGN KEY (attempt_id) REFERENCES Attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES Questions(question_id),
  UNIQUE (attempt_id, question_id)
);

-- Table 8: Scores (populated by stored procedure)
CREATE TABLE Scores (
  score_id      INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id    INT NOT NULL UNIQUE,
  user_id       INT NOT NULL,
  exam_id       INT NOT NULL,
  total_score   DECIMAL(6,2) NOT NULL,
  correct_count INT DEFAULT 0,
  wrong_count   INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  scored_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES Attempts(attempt_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (exam_id) REFERENCES Exams(exam_id)
);

-- Table 9: Notifications (populated by trigger)
CREATE TABLE Notifications (
  notif_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  message    TEXT NOT NULL,
  type       ENUM('pass', 'fail', 'top_scorer') NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Indexes
CREATE INDEX idx_attempts_user  ON Attempts(user_id);
CREATE INDEX idx_scores_exam    ON Scores(exam_id);
CREATE INDEX idx_answers_attempt ON Answers(attempt_id);

-- Seed: admin account
INSERT INTO Users (name, email, password_hash, role)
VALUES ('Admin', 'admin@quizapp.com', '$2b$10$REPLACEWITHREALBCRYPTHASH', 'admin');

-- Seed: categories
INSERT INTO Categories (name) VALUES
  ('Mathematics'), ('Computer Science'),
  ('General Knowledge'), ('DBMS');
