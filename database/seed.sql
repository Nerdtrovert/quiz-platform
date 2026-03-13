USE quiz_platform;

-- ============================================================
-- SEED DATA - Quiz Platform
-- Aligned with database/schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM Scores WHERE score_id > 0;
DELETE FROM Responses WHERE response_id > 0;
DELETE FROM Participants WHERE participant_id > 0;
DELETE FROM Rooms WHERE room_id > 0;
DELETE FROM StaticAttempts WHERE attempt_id > 0;
DELETE FROM QuizQuestions WHERE id > 0;
DELETE FROM Quizzes WHERE quiz_id > 0;
DELETE FROM Options WHERE option_id > 0;
DELETE FROM QuestionBank WHERE question_id > 0;
DELETE FROM Admins WHERE admin_id > 0;

ALTER TABLE Admins AUTO_INCREMENT = 1;
ALTER TABLE QuestionBank AUTO_INCREMENT = 1;
ALTER TABLE Options AUTO_INCREMENT = 1;
ALTER TABLE Quizzes AUTO_INCREMENT = 1;
ALTER TABLE QuizQuestions AUTO_INCREMENT = 1;
ALTER TABLE StaticAttempts AUTO_INCREMENT = 1;
ALTER TABLE Rooms AUTO_INCREMENT = 1;
ALTER TABLE Participants AUTO_INCREMENT = 1;
ALTER TABLE Responses AUTO_INCREMENT = 1;
ALTER TABLE Scores AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- SYSTEM ADMIN
-- ------------------------------------------------------------
INSERT INTO Admins (admin_id, name, email, password_hash) VALUES
(1, 'System', 'admin@quizapp.com', '$2b$10$placeholder_not_for_login');

-- ------------------------------------------------------------
-- QUESTION BANK
-- ------------------------------------------------------------

-- Science Q1-Q20
INSERT INTO QuestionBank (question_id, admin_id, question_text, genre, difficulty, base_points) VALUES
(1, 1, 'What is the chemical symbol for Gold?', 'Science', 'easy', 500),
(2, 1, 'How many bones are in the adult human body?', 'Science', 'easy', 500),
(3, 1, 'What planet is known as the Red Planet?', 'Science', 'easy', 500),
(4, 1, 'What is the powerhouse of the cell?', 'Science', 'easy', 500),
(5, 1, 'What gas do plants absorb during photosynthesis?', 'Science', 'easy', 500),
(6, 1, 'What force keeps planets in orbit around the Sun?', 'Science', 'easy', 500),
(7, 1, 'How many planets are in our solar system?', 'Science', 'easy', 500),
(8, 1, 'What is the boiling point of water in Celsius?', 'Science', 'easy', 500),
(9, 1, 'What is the largest organ in the human body?', 'Science', 'easy', 500),
(10, 1, 'What is the chemical symbol for water?', 'Science', 'easy', 500),
(11, 1, 'What is the speed of light in vacuum (approx)?', 'Science', 'medium', 750),
(12, 1, 'What is the atomic number of Carbon?', 'Science', 'medium', 750),
(13, 1, 'Which scientist proposed the theory of general relativity?', 'Science', 'medium', 750),
(14, 1, 'What is the chemical formula for table salt?', 'Science', 'medium', 750),
(15, 1, 'Which organelle is responsible for protein synthesis?', 'Science', 'medium', 750),
(16, 1, 'What type of bond is formed when electrons are shared?', 'Science', 'medium', 750),
(17, 1, 'What is Newtons second law of motion?', 'Science', 'medium', 750),
(18, 1, 'What is the most abundant gas in Earths atmosphere?', 'Science', 'medium', 750),
(19, 1, 'What is the half-life of Carbon-14 (approx years)?', 'Science', 'hard', 1000),
(20, 1, 'What is the value of Avogadros number?', 'Science', 'hard', 1000);

-- History Q21-Q40
INSERT INTO QuestionBank (question_id, admin_id, question_text, genre, difficulty, base_points) VALUES
(21, 1, 'In which year did World War II end?', 'History', 'easy', 500),
(22, 1, 'Who was the first President of the United States?', 'History', 'easy', 500),
(23, 1, 'In which year did India gain independence?', 'History', 'easy', 500),
(24, 1, 'What was the first artificial satellite sent to space?', 'History', 'easy', 500),
(25, 1, 'Which country did Napoleon Bonaparte come from?', 'History', 'easy', 500),
(26, 1, 'The Berlin Wall fell in which year?', 'History', 'easy', 500),
(27, 1, 'Who was the first man to walk on the Moon?', 'History', 'easy', 500),
(28, 1, 'In which country did the French Revolution begin?', 'History', 'easy', 500),
(29, 1, 'In which year did the Titanic sink?', 'History', 'easy', 500),
(30, 1, 'Who was the first female Prime Minister of the UK?', 'History', 'easy', 500),
(31, 1, 'Which ancient wonder was located in Alexandria?', 'History', 'medium', 750),
(32, 1, 'Who wrote the Declaration of Independence?', 'History', 'medium', 750),
(33, 1, 'In which year was the Magna Carta signed?', 'History', 'medium', 750),
(34, 1, 'Which empire was ruled by Genghis Khan?', 'History', 'medium', 750),
(35, 1, 'What was the name of the first nuclear bomb dropped in WWII?', 'History', 'medium', 750),
(36, 1, 'Who led the Cuban Revolution?', 'History', 'medium', 750),
(37, 1, 'In which city was the UN headquarters established in 1945?', 'History', 'medium', 750),
(38, 1, 'Which war was fought between the North and South of the USA?', 'History', 'medium', 750),
(39, 1, 'Who was the last Tsar of Russia?', 'History', 'hard', 1000),
(40, 1, 'What treaty ended World War I?', 'History', 'hard', 1000);

-- Tech Q41-Q60
INSERT INTO QuestionBank (question_id, admin_id, question_text, genre, difficulty, base_points) VALUES
(41, 1, 'What does CPU stand for?', 'Tech', 'easy', 500),
(42, 1, 'What does HTML stand for?', 'Tech', 'easy', 500),
(43, 1, 'Which company created the Java programming language?', 'Tech', 'easy', 500),
(44, 1, 'What does RAM stand for?', 'Tech', 'easy', 500),
(45, 1, 'Which programming language is known as the language of the web?', 'Tech', 'easy', 500),
(46, 1, 'What does URL stand for?', 'Tech', 'easy', 500),
(47, 1, 'Who co-founded Apple with Steve Jobs?', 'Tech', 'easy', 500),
(48, 1, 'What does GPU stand for?', 'Tech', 'easy', 500),
(49, 1, 'What does DNS stand for?', 'Tech', 'easy', 500),
(50, 1, 'Which company developed the Android operating system?', 'Tech', 'easy', 500),
(51, 1, 'What is the binary representation of the decimal number 10?', 'Tech', 'medium', 750),
(52, 1, 'What does SQL stand for?', 'Tech', 'medium', 750),
(53, 1, 'Which data structure uses LIFO order?', 'Tech', 'medium', 750),
(54, 1, 'What is the time complexity of binary search?', 'Tech', 'medium', 750),
(55, 1, 'What does API stand for?', 'Tech', 'medium', 750),
(56, 1, 'Which protocol is used to send emails?', 'Tech', 'medium', 750),
(57, 1, 'What is a deadlock in operating systems?', 'Tech', 'medium', 750),
(58, 1, 'What does REST stand for in web development?', 'Tech', 'medium', 750),
(59, 1, 'What is the difference between TCP and UDP?', 'Tech', 'hard', 1000),
(60, 1, 'What is the CAP theorem in distributed systems?', 'Tech', 'hard', 1000);

-- Mixed Q61-Q80
INSERT INTO QuestionBank (question_id, admin_id, question_text, genre, difficulty, base_points) VALUES
(61, 1, 'How many continents are there on Earth?', 'Mixed', 'easy', 500),
(62, 1, 'What is the capital of Japan?', 'Mixed', 'easy', 500),
(63, 1, 'How many sides does a hexagon have?', 'Mixed', 'easy', 500),
(64, 1, 'What is the largest ocean on Earth?', 'Mixed', 'easy', 500),
(65, 1, 'Who painted the Mona Lisa?', 'Mixed', 'easy', 500),
(66, 1, 'What is the fastest land animal?', 'Mixed', 'easy', 500),
(67, 1, 'How many strings does a standard guitar have?', 'Mixed', 'easy', 500),
(68, 1, 'What is the square root of 144?', 'Mixed', 'easy', 500),
(69, 1, 'Which planet is closest to the Sun?', 'Mixed', 'easy', 500),
(70, 1, 'What language has the most native speakers in the world?', 'Mixed', 'easy', 500),
(71, 1, 'What is the currency of Japan?', 'Mixed', 'medium', 750),
(72, 1, 'In which sport would you perform a slam dunk?', 'Mixed', 'medium', 750),
(73, 1, 'What is the longest river in the world?', 'Mixed', 'medium', 750),
(74, 1, 'Who wrote the play Romeo and Juliet?', 'Mixed', 'medium', 750),
(75, 1, 'What is the chemical symbol for Iron?', 'Mixed', 'medium', 750),
(76, 1, 'How many players are on a standard soccer team?', 'Mixed', 'medium', 750),
(77, 1, 'What is the smallest country in the world by area?', 'Mixed', 'medium', 750),
(78, 1, 'Which element has the highest melting point?', 'Mixed', 'medium', 750),
(79, 1, 'What is the Golden Ratio (approx)?', 'Mixed', 'hard', 1000),
(80, 1, 'Which mathematician proved Fermats Last Theorem in 1995?', 'Mixed', 'hard', 1000);

-- ------------------------------------------------------------
-- OPTIONS
-- ------------------------------------------------------------
INSERT INTO Options (question_id, option_number, option_text, is_correct) VALUES
(1, 1, 'Au', 1), (1, 2, 'Go', 0), (1, 3, 'Gd', 0), (1, 4, 'Ag', 0),
(2, 1, '206', 1), (2, 2, '208', 0), (2, 3, '196', 0), (2, 4, '212', 0),
(3, 1, 'Mars', 1), (3, 2, 'Venus', 0), (3, 3, 'Jupiter', 0), (3, 4, 'Saturn', 0),
(4, 1, 'Mitochondria', 1), (4, 2, 'Nucleus', 0), (4, 3, 'Ribosome', 0), (4, 4, 'Lysosome', 0),
(5, 1, 'Carbon dioxide', 1), (5, 2, 'Oxygen', 0), (5, 3, 'Nitrogen', 0), (5, 4, 'Hydrogen', 0),
(6, 1, 'Gravity', 1), (6, 2, 'Magnetism', 0), (6, 3, 'Friction', 0), (6, 4, 'Electrostatic force', 0),
(7, 1, '8', 1), (7, 2, '7', 0), (7, 3, '9', 0), (7, 4, '10', 0),
(8, 1, '100 degrees C', 1), (8, 2, '90 degrees C', 0), (8, 3, '110 degrees C', 0), (8, 4, '212 degrees C', 0),
(9, 1, 'Skin', 1), (9, 2, 'Liver', 0), (9, 3, 'Brain', 0), (9, 4, 'Intestine', 0),
(10, 1, 'H2O', 1), (10, 2, 'HO', 0), (10, 3, 'H2O2', 0), (10, 4, 'OH2', 0),
(11, 1, '3 x 10^8 m/s', 1), (11, 2, '3 x 10^6 m/s', 0), (11, 3, '3 x 10^10 m/s', 0), (11, 4, '3 x 10^5 m/s', 0),
(12, 1, '6', 1), (12, 2, '12', 0), (12, 3, '8', 0), (12, 4, '14', 0),
(13, 1, 'Albert Einstein', 1), (13, 2, 'Isaac Newton', 0), (13, 3, 'Niels Bohr', 0), (13, 4, 'Max Planck', 0),
(14, 1, 'NaCl', 1), (14, 2, 'KCl', 0), (14, 3, 'NaOH', 0), (14, 4, 'CaCl2', 0),
(15, 1, 'Ribosome', 1), (15, 2, 'Mitochondria', 0), (15, 3, 'Golgi apparatus', 0), (15, 4, 'Vacuole', 0),
(16, 1, 'Covalent bond', 1), (16, 2, 'Ionic bond', 0), (16, 3, 'Hydrogen bond', 0), (16, 4, 'Metallic bond', 0),
(17, 1, 'F = ma', 1), (17, 2, 'F = mv', 0), (17, 3, 'F = mg', 0), (17, 4, 'F = pa', 0),
(18, 1, 'Nitrogen 78 percent', 1), (18, 2, 'Oxygen 78 percent', 0), (18, 3, 'Carbon dioxide', 0), (18, 4, 'Argon', 0),
(19, 1, '5730 years', 1), (19, 2, '1000 years', 0), (19, 3, '10000 years', 0), (19, 4, '50000 years', 0),
(20, 1, '6.022 x 10^23', 1), (20, 2, '6.022 x 10^22', 0), (20, 3, '6.022 x 10^24', 0), (20, 4, '3.011 x 10^23', 0),
(21, 1, '1945', 1), (21, 2, '1944', 0), (21, 3, '1946', 0), (21, 4, '1943', 0),
(22, 1, 'George Washington', 1), (22, 2, 'Abraham Lincoln', 0), (22, 3, 'Thomas Jefferson', 0), (22, 4, 'John Adams', 0),
(23, 1, '1947', 1), (23, 2, '1945', 0), (23, 3, '1950', 0), (23, 4, '1942', 0),
(24, 1, 'Sputnik 1', 1), (24, 2, 'Apollo 1', 0), (24, 3, 'Explorer 1', 0), (24, 4, 'Vostok 1', 0),
(25, 1, 'France', 1), (25, 2, 'Italy', 0), (25, 3, 'Corsica', 0), (25, 4, 'Russia', 0),
(26, 1, '1989', 1), (26, 2, '1991', 0), (26, 3, '1987', 0), (26, 4, '1985', 0),
(27, 1, 'Neil Armstrong', 1), (27, 2, 'Buzz Aldrin', 0), (27, 3, 'Yuri Gagarin', 0), (27, 4, 'John Glenn', 0),
(28, 1, 'France', 1), (28, 2, 'England', 0), (28, 3, 'Germany', 0), (28, 4, 'Spain', 0),
(29, 1, '1912', 1), (29, 2, '1910', 0), (29, 3, '1914', 0), (29, 4, '1908', 0),
(30, 1, 'Margaret Thatcher', 1), (30, 2, 'Theresa May', 0), (30, 3, 'Indira Gandhi', 0), (30, 4, 'Angela Merkel', 0),
(31, 1, 'Lighthouse of Alexandria', 1), (31, 2, 'Colossus of Rhodes', 0), (31, 3, 'Hanging Gardens', 0), (31, 4, 'Statue of Zeus', 0),
(32, 1, 'Thomas Jefferson', 1), (32, 2, 'Benjamin Franklin', 0), (32, 3, 'John Adams', 0), (32, 4, 'George Washington', 0),
(33, 1, '1215', 1), (33, 2, '1066', 0), (33, 3, '1415', 0), (33, 4, '1189', 0),
(34, 1, 'Mongol Empire', 1), (34, 2, 'Ottoman Empire', 0), (34, 3, 'Roman Empire', 0), (34, 4, 'Persian Empire', 0),
(35, 1, 'Little Boy', 1), (35, 2, 'Fat Man', 0), (35, 3, 'Trinity', 0), (35, 4, 'Big Bang', 0),
(36, 1, 'Fidel Castro', 1), (36, 2, 'Che Guevara', 0), (36, 3, 'Simon Bolivar', 0), (36, 4, 'Hugo Chavez', 0),
(37, 1, 'New York City', 1), (37, 2, 'Geneva', 0), (37, 3, 'London', 0), (37, 4, 'Washington DC', 0),
(38, 1, 'American Civil War', 1), (38, 2, 'War of Independence', 0), (38, 3, 'Mexican-American War', 0), (38, 4, 'Korean War', 0),
(39, 1, 'Nicholas II', 1), (39, 2, 'Alexander III', 0), (39, 3, 'Peter the Great', 0), (39, 4, 'Ivan the Terrible', 0),
(40, 1, 'Treaty of Versailles', 1), (40, 2, 'Treaty of Paris', 0), (40, 3, 'Treaty of Westphalia', 0), (40, 4, 'Treaty of Utrecht', 0),
(41, 1, 'Central Processing Unit', 1), (41, 2, 'Core Processing Unit', 0), (41, 3, 'Central Program Unit', 0), (41, 4, 'Computer Processing Unit', 0),
(42, 1, 'HyperText Markup Language', 1), (42, 2, 'HyperText Machine Language', 0), (42, 3, 'HighText Markup Language', 0), (42, 4, 'HyperTransfer Markup Language', 0),
(43, 1, 'Sun Microsystems', 1), (43, 2, 'Microsoft', 0), (43, 3, 'IBM', 0), (43, 4, 'Oracle', 0),
(44, 1, 'Random Access Memory', 1), (44, 2, 'Read Access Memory', 0), (44, 3, 'Rapid Access Memory', 0), (44, 4, 'Random Application Memory', 0),
(45, 1, 'JavaScript', 1), (45, 2, 'Python', 0), (45, 3, 'PHP', 0), (45, 4, 'Ruby', 0),
(46, 1, 'Uniform Resource Locator', 1), (46, 2, 'Universal Resource Link', 0), (46, 3, 'Unique Resource Locator', 0), (46, 4, 'Uniform Reference Link', 0),
(47, 1, 'Steve Wozniak', 1), (47, 2, 'Bill Gates', 0), (47, 3, 'Elon Musk', 0), (47, 4, 'Larry Page', 0),
(48, 1, 'Graphics Processing Unit', 1), (48, 2, 'General Processing Unit', 0), (48, 3, 'Graphical Program Utility', 0), (48, 4, 'Graphics Program Unit', 0),
(49, 1, 'Domain Name System', 1), (49, 2, 'Dynamic Network Service', 0), (49, 3, 'Domain Network Server', 0), (49, 4, 'Data Name System', 0),
(50, 1, 'Google', 1), (50, 2, 'Apple', 0), (50, 3, 'Samsung', 0), (50, 4, 'Microsoft', 0),
(51, 1, '1010', 1), (51, 2, '1001', 0), (51, 3, '1100', 0), (51, 4, '0110', 0),
(52, 1, 'Structured Query Language', 1), (52, 2, 'Simple Query Language', 0), (52, 3, 'Structured Question Language', 0), (52, 4, 'System Query Logic', 0),
(53, 1, 'Stack', 1), (53, 2, 'Queue', 0), (53, 3, 'Heap', 0), (53, 4, 'Tree', 0),
(54, 1, 'O(log n)', 1), (54, 2, 'O(n)', 0), (54, 3, 'O(n^2)', 0), (54, 4, 'O(1)', 0),
(55, 1, 'Application Programming Interface', 1), (55, 2, 'Application Process Integration', 0), (55, 3, 'Applied Program Interface', 0), (55, 4, 'Automated Programming Interface', 0),
(56, 1, 'SMTP', 1), (56, 2, 'HTTP', 0), (56, 3, 'FTP', 0), (56, 4, 'IMAP', 0),
(57, 1, 'Two processes waiting on each other indefinitely', 1), (57, 2, 'A process using 100 percent CPU', 0), (57, 3, 'Memory overflow error', 0), (57, 4, 'A crashed thread', 0),
(58, 1, 'Representational State Transfer', 1), (58, 2, 'Remote Execution State Transfer', 0), (58, 3, 'Resource State Transfer', 0), (58, 4, 'Reliable State Transfer', 0),
(59, 1, 'TCP is reliable and connection-oriented; UDP is faster and connectionless', 1), (59, 2, 'TCP is faster; UDP is reliable', 0), (59, 3, 'Both are connection-oriented', 0), (59, 4, 'UDP guarantees packet delivery', 0),
(60, 1, 'Consistency Availability Partition tolerance - only 2 of 3 guaranteed', 1), (60, 2, 'Speed Scale and Security', 0), (60, 3, 'CPU Access Persistence', 0), (60, 4, 'Cache API Protocol', 0),
(61, 1, '7', 1), (61, 2, '6', 0), (61, 3, '8', 0), (61, 4, '5', 0),
(62, 1, 'Tokyo', 1), (62, 2, 'Osaka', 0), (62, 3, 'Kyoto', 0), (62, 4, 'Hiroshima', 0),
(63, 1, '6', 1), (63, 2, '5', 0), (63, 3, '7', 0), (63, 4, '8', 0),
(64, 1, 'Pacific Ocean', 1), (64, 2, 'Atlantic Ocean', 0), (64, 3, 'Indian Ocean', 0), (64, 4, 'Arctic Ocean', 0),
(65, 1, 'Leonardo da Vinci', 1), (65, 2, 'Michelangelo', 0), (65, 3, 'Raphael', 0), (65, 4, 'Rembrandt', 0),
(66, 1, 'Cheetah', 1), (66, 2, 'Lion', 0), (66, 3, 'Leopard', 0), (66, 4, 'Greyhound', 0),
(67, 1, '6', 1), (67, 2, '4', 0), (67, 3, '7', 0), (67, 4, '5', 0),
(68, 1, '12', 1), (68, 2, '14', 0), (68, 3, '11', 0), (68, 4, '13', 0),
(69, 1, 'Mercury', 1), (69, 2, 'Venus', 0), (69, 3, 'Earth', 0), (69, 4, 'Mars', 0),
(70, 1, 'Mandarin Chinese', 1), (70, 2, 'English', 0), (70, 3, 'Spanish', 0), (70, 4, 'Hindi', 0),
(71, 1, 'Yen', 1), (71, 2, 'Won', 0), (71, 3, 'Yuan', 0), (71, 4, 'Baht', 0),
(72, 1, 'Basketball', 1), (72, 2, 'Volleyball', 0), (72, 3, 'Soccer', 0), (72, 4, 'Tennis', 0),
(73, 1, 'Nile', 1), (73, 2, 'Amazon', 0), (73, 3, 'Yangtze', 0), (73, 4, 'Mississippi', 0),
(74, 1, 'William Shakespeare', 1), (74, 2, 'Charles Dickens', 0), (74, 3, 'Jane Austen', 0), (74, 4, 'Christopher Marlowe', 0),
(75, 1, 'Fe', 1), (75, 2, 'Ir', 0), (75, 3, 'In', 0), (75, 4, 'Fm', 0),
(76, 1, '11', 1), (76, 2, '10', 0), (76, 3, '9', 0), (76, 4, '12', 0),
(77, 1, 'Vatican City', 1), (77, 2, 'Monaco', 0), (77, 3, 'San Marino', 0), (77, 4, 'Liechtenstein', 0),
(78, 1, 'Tungsten', 1), (78, 2, 'Carbon', 0), (78, 3, 'Osmium', 0), (78, 4, 'Titanium', 0),
(79, 1, '1.618', 1), (79, 2, '3.14', 0), (79, 3, '2.718', 0), (79, 4, '1.414', 0),
(80, 1, 'Andrew Wiles', 1), (80, 2, 'Grigori Perelman', 0), (80, 3, 'John Nash', 0), (80, 4, 'Terence Tao', 0);

-- ------------------------------------------------------------
-- STATIC QUIZZES
-- time_per_question must be one of 10, 20, 30, 60 per schema
-- ------------------------------------------------------------
INSERT INTO Quizzes (quiz_id, admin_id, title, genre, difficulty, num_questions, time_per_question, is_static) VALUES
(1, 1, 'Science Blast', 'Science', 'mixed', 15, 20, 1),
(2, 1, 'History Hunt', 'History', 'mixed', 15, 20, 1),
(3, 1, 'Tech Talk', 'Tech', 'mixed', 15, 20, 1),
(4, 1, 'Mixed Madness', 'Mixed', 'mixed', 15, 20, 1);

-- ------------------------------------------------------------
-- QUIZ QUESTIONS
-- 15 per quiz
-- ------------------------------------------------------------
INSERT INTO QuizQuestions (quiz_id, question_id, order_index) VALUES
(1, 2, 1), (1, 1, 2), (1, 5, 3), (1, 10, 4), (1, 7, 5),
(1, 13, 6), (1, 16, 7), (1, 11, 8), (1, 15, 9), (1, 17, 10),
(1, 19, 11), (1, 20, 12), (1, 18, 13), (1, 14, 14), (1, 12, 15),
(2, 21, 1), (2, 22, 2), (2, 24, 3), (2, 29, 4), (2, 25, 5),
(2, 31, 6), (2, 35, 7), (2, 32, 8), (2, 37, 9), (2, 34, 10),
(2, 39, 11), (2, 40, 12), (2, 33, 13), (2, 36, 14), (2, 38, 15),
(3, 41, 1), (3, 43, 2), (3, 47, 3), (3, 49, 4), (3, 48, 5),
(3, 53, 6), (3, 52, 7), (3, 58, 8), (3, 51, 9), (3, 55, 10),
(3, 59, 11), (3, 60, 12), (3, 56, 13), (3, 54, 14), (3, 57, 15),
(4, 66, 1), (4, 65, 2), (4, 61, 3), (4, 70, 4), (4, 64, 5),
(4, 72, 6), (4, 74, 7), (4, 71, 8), (4, 75, 9), (4, 73, 10),
(4, 79, 11), (4, 80, 12), (4, 78, 13), (4, 77, 14), (4, 76, 15);
