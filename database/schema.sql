-- =============================================
-- Quiz Platform — Full Database Schema
-- MySQL 8.0+ | 10 Tables
-- =============================================

CREATE DATABASE IF NOT EXISTS quiz_platform;
USE quiz_platform;

-- =============================================
-- TABLE 1: Admins
-- Stores host/admin accounts
-- =============================================
CREATE TABLE Admins (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 2: QuestionBank
-- All questions created by admins
-- Reusable across multiple quizzes
-- =============================================
CREATE TABLE QuestionBank (
  question_id   INT AUTO_INCREMENT PRIMARY KEY,
  admin_id      INT NOT NULL,
  question_text TEXT NOT NULL,
  genre         VARCHAR(100) NOT NULL,
  difficulty    ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  base_points   INT NOT NULL DEFAULT 500,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES Admins(admin_id) ON DELETE CASCADE,
  CHECK (base_points > 0)
);

-- =============================================
-- TABLE 3: Options
-- 4 answer options per question
-- Only one option can be correct per question
-- =============================================
CREATE TABLE Options (
  option_id     INT AUTO_INCREMENT PRIMARY KEY,
  question_id   INT NOT NULL,
  option_number TINYINT NOT NULL,
  option_text   TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES QuestionBank(question_id) ON DELETE CASCADE,
  CHECK (option_number BETWEEN 1 AND 4),
  UNIQUE (question_id, option_number)
);

-- =============================================
-- TABLE 4: Quizzes
-- Quiz configurations
-- is_static = TRUE → landing page static quiz
-- is_static = FALSE → live quiz hosted by admin
-- =============================================
CREATE TABLE Quizzes (
  quiz_id           INT AUTO_INCREMENT PRIMARY KEY,
  admin_id          INT,
  title             VARCHAR(200) NOT NULL,
  genre             VARCHAR(100) NOT NULL,
  difficulty        ENUM('easy', 'medium', 'hard', 'mixed') NOT NULL DEFAULT 'mixed',
  num_questions     INT NOT NULL,
  time_per_question INT NOT NULL DEFAULT 30,
  is_static         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES Admins(admin_id) ON DELETE SET NULL,
  CHECK (num_questions > 0),
  CHECK (time_per_question IN (10, 20, 30, 60))
);

-- =============================================
-- TABLE 5: QuizQuestions
-- Many-to-many bridge: Quizzes <-> QuestionBank
-- Controls which questions appear in which quiz
-- and in what order
-- =============================================
CREATE TABLE QuizQuestions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id      INT NOT NULL,
  question_id  INT NOT NULL,
  order_index  INT NOT NULL,
  FOREIGN KEY (quiz_id)     REFERENCES Quizzes(quiz_id)      ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES QuestionBank(question_id) ON DELETE CASCADE,
  UNIQUE (quiz_id, question_id),
  UNIQUE (quiz_id, order_index)
);

-- =============================================
-- TABLE 6: StaticAttempts
-- Records every attempt on a static quiz
-- No account needed — just player name
-- Updates static leaderboard on completion
-- =============================================
CREATE TABLE StaticAttempts (
  attempt_id    INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id       INT NOT NULL,
  player_name   VARCHAR(100) NOT NULL,
  total_points  DECIMAL(10,2) NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count   INT NOT NULL DEFAULT 0,
  time_taken_ms INT NOT NULL DEFAULT 0,
  final_rank    INT,
  completed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES Quizzes(quiz_id) ON DELETE CASCADE
);

-- =============================================
-- TABLE 7: Rooms
-- A live quiz session hosted by admin
-- room_code is the 6-char join code
-- Tracks current question + room status
-- =============================================
CREATE TABLE Rooms (
  room_id                  INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id                  INT NOT NULL,
  admin_id                 INT NOT NULL,
  room_code                VARCHAR(6) NOT NULL UNIQUE,
  status                   ENUM('waiting', 'active', 'paused', 'ended') NOT NULL DEFAULT 'waiting',
  current_question_index   INT NOT NULL DEFAULT 0,
  started_at               DATETIME,
  ended_at                 DATETIME,
  FOREIGN KEY (quiz_id)  REFERENCES Quizzes(quiz_id)  ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES Admins(admin_id)  ON DELETE CASCADE
);

-- =============================================
-- TABLE 8: Participants
-- Everyone who joins a live room
-- No account needed — name only
-- Tracks live streak + multiplier
-- =============================================
CREATE TABLE Participants (
  participant_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id        INT NOT NULL,
  name           VARCHAR(100) NOT NULL,
  joined_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  streak         INT NOT NULL DEFAULT 0,
  multiplier     DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  FOREIGN KEY (room_id) REFERENCES Rooms(room_id) ON DELETE CASCADE,
  CHECK (multiplier >= 1.00),
  CHECK (streak >= 0)
);

-- =============================================
-- TABLE 9: Responses
-- Every answer submitted in a live quiz
-- Records option chosen, time taken, points earned
-- NULL selected_option = no answer (timed out)
-- =============================================
CREATE TABLE Responses (
  response_id      INT AUTO_INCREMENT PRIMARY KEY,
  participant_id   INT NOT NULL,
  question_id      INT NOT NULL,
  room_id          INT NOT NULL,
  selected_option  TINYINT,
  is_correct       BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms INT NOT NULL DEFAULT 0,
  points_earned    DECIMAL(8,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (participant_id) REFERENCES Participants(participant_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id)    REFERENCES QuestionBank(question_id),
  FOREIGN KEY (room_id)        REFERENCES Rooms(room_id) ON DELETE CASCADE,
  UNIQUE (participant_id, question_id),
  CHECK (response_time_ms >= 0)
);

-- =============================================
-- TABLE 10: Scores
-- Final score summary per participant per room
-- Auto-populated by stored procedure when quiz ends
-- final_rank computed via RANK() window function
-- =============================================
CREATE TABLE Scores (
  score_id        INT AUTO_INCREMENT PRIMARY KEY,
  participant_id  INT NOT NULL UNIQUE,
  room_id         INT NOT NULL,
  total_points    DECIMAL(10,2) NOT NULL DEFAULT 0,
  correct_count   INT NOT NULL DEFAULT 0,
  wrong_count     INT NOT NULL DEFAULT 0,
  highest_streak  INT NOT NULL DEFAULT 0,
  final_rank      INT,
  scored_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES Participants(participant_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id)        REFERENCES Rooms(room_id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES
-- Speed up most frequent queries
-- =============================================
CREATE INDEX idx_questionbank_genre      ON QuestionBank(genre);
CREATE INDEX idx_questionbank_difficulty ON QuestionBank(difficulty);
CREATE INDEX idx_quizquestions_quiz      ON QuizQuestions(quiz_id);
CREATE INDEX idx_rooms_code              ON Rooms(room_code);
CREATE INDEX idx_participants_room       ON Participants(room_id);
CREATE INDEX idx_responses_participant   ON Responses(participant_id);
CREATE INDEX idx_scores_room             ON Scores(room_id);
CREATE INDEX idx_static_attempts_quiz    ON StaticAttempts(quiz_id);

-- =============================================
-- SEED DATA
-- =============================================

-- Seed admin account
-- Password: admin123 (replace with real bcrypt hash in production)
INSERT INTO Admins (name, email, password_hash)
VALUES ('Admin', 'admin@quizapp.com', '$2b$10$REPLACEWITHREALBCRYPTHASH');

-- Seed static quizzes
INSERT INTO Quizzes (admin_id, title, genre, difficulty, num_questions, time_per_question, is_static)
VALUES
  (NULL, 'Science Blast',   'Science', 'medium', 10, 20, TRUE),
  (NULL, 'History Hunt',    'History', 'medium', 10, 20, TRUE),
  (NULL, 'Tech Talk',       'Tech',    'medium', 10, 20, TRUE),
  (NULL, 'Mixed Madness',   'Mixed',   'mixed',  10, 20, TRUE);

-- =============================================
-- STORED PROCEDURE: CalculateFinalScores
-- Called when a live quiz room ends
-- Computes total_points, counts, highest_streak
-- Inserts into Scores table
-- final_rank assigned via RANK() in application layer
-- =============================================
DELIMITER $$

CREATE PROCEDURE CalculateFinalScores(IN p_room_id INT)
BEGIN
  INSERT INTO Scores (participant_id, room_id, total_points, correct_count, wrong_count, highest_streak)
  SELECT
    p.participant_id,
    p.room_id,
    COALESCE(SUM(r.points_earned), 0)  AS total_points,
    SUM(CASE WHEN r.is_correct = TRUE  THEN 1 ELSE 0 END) AS correct_count,
    SUM(CASE WHEN r.is_correct = FALSE AND r.selected_option IS NOT NULL THEN 1 ELSE 0 END) AS wrong_count,
    p.streak AS highest_streak
  FROM Participants p
  LEFT JOIN Responses r ON p.participant_id = r.participant_id
  WHERE p.room_id = p_room_id AND p.is_active = TRUE
  GROUP BY p.participant_id, p.room_id, p.streak;

  -- Update final_rank using RANK()
  UPDATE Scores s
  JOIN (
    SELECT
      participant_id,
      RANK() OVER (PARTITION BY room_id ORDER BY total_points DESC) AS rnk
    FROM Scores
    WHERE room_id = p_room_id
  ) ranked ON s.participant_id = ranked.participant_id
  SET s.final_rank = ranked.rnk
  WHERE s.room_id = p_room_id;

  -- Mark room as ended
  UPDATE Rooms SET status = 'ended', ended_at = NOW()
  WHERE room_id = p_room_id;
END$$

DELIMITER ;

-- =============================================
-- STORED PROCEDURE: UpdateStaticLeaderboard
-- Called after each static quiz attempt completes
-- Recomputes final_rank for all attempts of that quiz
-- =============================================
DELIMITER $$

CREATE PROCEDURE UpdateStaticLeaderboard(IN p_quiz_id INT)
BEGIN
  UPDATE StaticAttempts sa
  JOIN (
    SELECT
      attempt_id,
      RANK() OVER (ORDER BY total_points DESC, time_taken_ms ASC) AS rnk
    FROM StaticAttempts
    WHERE quiz_id = p_quiz_id
  ) ranked ON sa.attempt_id = ranked.attempt_id
  SET sa.final_rank = ranked.rnk
  WHERE sa.quiz_id = p_quiz_id;
END$$

DELIMITER ;

-- =============================================
-- TRIGGER: AfterScoreInsert
-- Fires after a score is inserted into Scores
-- Auto-updates room status if all participants scored
-- =============================================
DELIMITER $$

CREATE TRIGGER AfterScoreInsert
AFTER INSERT ON Scores
FOR EACH ROW
BEGIN
  DECLARE total_participants INT;
  DECLARE scored_participants INT;

  SELECT COUNT(*) INTO total_participants
  FROM Participants
  WHERE room_id = NEW.room_id AND is_active = TRUE;

  SELECT COUNT(*) INTO scored_participants
  FROM Scores
  WHERE room_id = NEW.room_id;

  IF total_participants = scored_participants THEN
    UPDATE Rooms SET status = 'ended', ended_at = NOW()
    WHERE room_id = NEW.room_id;
  END IF;
END$$

DELIMITER ;

-- =============================================
-- VIEW: StaticLeaderboardView
-- Clean view for static quiz leaderboards
-- Used directly by frontend API
-- =============================================
CREATE VIEW StaticLeaderboardView AS
SELECT
  sa.attempt_id,
  sa.quiz_id,
  q.title AS quiz_title,
  q.genre,
  sa.player_name,
  sa.total_points,
  sa.correct_count,
  sa.time_taken_ms,
  sa.final_rank,
  sa.completed_at
FROM StaticAttempts sa
JOIN Quizzes q ON sa.quiz_id = q.quiz_id
ORDER BY sa.quiz_id, sa.final_rank;

-- =============================================
-- VIEW: LiveLeaderboardView
-- Clean view for live quiz final leaderboard
-- =============================================
CREATE VIEW LiveLeaderboardView AS
SELECT
  s.score_id,
  s.room_id,
  r.room_code,
  p.name AS participant_name,
  s.total_points,
  s.correct_count,
  s.wrong_count,
  s.highest_streak,
  s.final_rank,
  s.scored_at
FROM Scores s
JOIN Participants p ON s.participant_id = p.participant_id
JOIN Rooms r ON s.room_id = r.room_id
ORDER BY s.room_id, s.final_rank;