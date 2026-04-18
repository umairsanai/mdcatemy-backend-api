CREATE TABLE subjects(
    subject_id SERIAL PRIMARY KEY,   
    subject_name VARCHAR(50) NOT NULL
);
CREATE TABLE chapters(
    chapter_id SERIAL PRIMARY KEY,
    chapter_name VARCHAR(50) NOT NULL,
    subject_id INT NOT NULL,

    CONSTRAINT fkey_chapter_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE topics(
    topic_id SERIAL PRIMARY KEY,
    topic_name VARCHAR(50) NOT NULL,
    subject_id INT NOT NULL,
    chapter_id INT NOT NULL,

    CONSTRAINT fkey_topic_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_topic_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT NOT NULL CHECK(age > 0),
    email VARCHAR(50) NOT NULL UNIQUE,
    gender CHAR(1) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    password VARCHAR(100) NOT NULL,
    password_changed_at BIGINT DEFAULT 0 CHECK(password_changed_at >= 0),
    created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TYPE PAYMENT_STATUS AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE students (
    student_id INT PRIMARY KEY,
    academic_status VARCHAR(50) NOT NULL DEFAULT 'Fresher',
    streak INT NOT NULL DEFAULT 0, 
    total_mistakes INT NOT NULL DEFAULT 0,
    new_student BOOLEAN NOT NULL DEFAULT 1,
    payment_status PAYMENT_STATUS NOT NULL DEFAULT 'PENDING',

    CONSTRAINT streak_non_negative CHECK(streak >= 0),
    CONSTRAINT total_mistakes_non_negative CHECK(total_mistakes >= 0),
    CONSTRAINT fkey_student_user FOREIGN KEY (student_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
);

CREATE TABLE mcq_bank(
    mcq_id SERIAL PRIMARY KEY,
    question VARCHAR(300) NOT NULL,
    option_a VARCHAR(200) NOT NULL,
    option_b VARCHAR(200) NOT NULL,
    option_c VARCHAR(200) NOT NULL,
    option_d VARCHAR(200) NOT NULL,
    correct_option CHAR(1) NOT NULL,
    explanation VARCHAR(300),
    attempt_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    difficulty VARCHAR(6) NOT NULL DEFAULT 'Easy',
    chapter_id INT NOT NULL,
    topic_id INT NOT NULL,
    subject_id INT NOT NULL,

    CONSTRAINT fkey_mcqbank_chapter FOREIGN KEY(chapter_id) REFERENCES chapters(chapter_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_mcqbank_topic FOREIGN KEY(topic_id) REFERENCES topics(topic_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_mcqbank_subject FOREIGN KEY(subject_id) REFERENCES subjects(subject_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT attempt_count_non_negative CHECK(attempt_count >= 0),
    CONSTRAINT correct_count_non_negative CHECK(correct_count >= 0 AND correct_count <= attempt_count)
);

CREATE TABLE bookmarks(
    student_id INT NOT NULL,
    mcq_id INT NOT NULL,
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE, 

    CONSTRAINT pkey_bookmarks PRIMARY KEY(student_id, mcq_id),
    CONSTRAINT fkey_bookmarks_mcqbank FOREIGN KEY(mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_bookmarks_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE attempted_mcqs(
    student_id INT NOT NULL,
    mcq_id INT NOT NULL,
    selected_option CHAR(1),
    quiz_id INT,
    test_id INT,
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE, 
    -- What should happen when a user corrects the previously wronged mcq or vice versa? 

    CONSTRAINT check_mcq_belonging CHECK ((quiz_id IS NOT NULL AND test_id IS NULL) OR (quiz_id IS NULL AND test_id IS NOT NULL)),
    CONSTRAINT fkey_attemptedmcqs_quizzes FOREIGN KEY(quiz_id) REFERENCES quizzes(quiz_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_attemptedmcqs_tests FOREIGN KEY(test_id) REFERENCES tests(test_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_attemptedmcqs_mcqbank FOREIGN KEY(mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_attemptedmcqs_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_unique_attemptedmcq 
ON attempted_mcqs (student_id, mcq_id, quiz_id, test_id) 
NULLS NOT DISTINCT;

CREATE TABLE activity(
    activity_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    attempt_count INT NOT NULL,
    correct_count INT NOT NULL,
    streak INT NOT NULL DEFAULT 0,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE, 

    CONSTRAINT attempt_count_non_negative CHECK(attempt_count >= 0),
    CONSTRAINT correct_count_non_negative CHECK(correct_count >= 0),
    CONSTRAINT fkey_activity_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE quizzes(
    quiz_id SERIAL PRIMARY KEY,
    quiz_name VARCHAR(30) NOT NULL UNIQUE,
    slug VARCHAR(30) NOT NULL UNIQUE,
    attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mcq_count INT NOT NULL CHECK(mcq_count > 0)
);

CREATE TABLE tests(
    test_id SERIAL PRIMARY KEY,
    test_name VARCHAR(30) NOT NULL UNIQUE,
    slug VARCHAR(30) NOT NULL UNIQUE,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mcq_count INT NOT NULL CHECK(mcq_count > 0),
    test_time INT NOT NULL CHECK(test_time > 0)  -- In minutes
); 

CREATE TABLE test_enrollments(
    test_id INT NOT NULL,
    student_id INT NOT NULL,
    
    CONSTRAINT pkey_testenrollments PRIMARY KEY (test_id, student_id),
    CONSTRAINT fkey_testenrollments_tests FOREIGN KEY (test_id) REFERENCES tests(test_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_testenrollments_students FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE test_mcqs(
    test_id INT NOT NULL,
    mcq_id INT NOT NULL,

    CONSTRAINT pkey_testmcqs PRIMARY KEY(test_id, mcq_id),
    CONSTRAINT fkey_testmcqs_tests FOREIGN KEY (test_id) REFERENCES tests(test_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_testmcqs_mcqbank FOREIGN KEY (mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE
);
