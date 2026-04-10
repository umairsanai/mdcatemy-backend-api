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
CREATE TABLE student(
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender CHAR(1) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    academic_status VARCHAR(50) NOT NULL DEFAULT 'Fresher',
    created_at DATE NOT NULL DEFAULT CURRENT_DATE, 
    streak INT NOT NULL DEFAULT 0, 
    CONSTRAINT streak_non_negative CHECK(streak >= 0),
    CONSTRAINT age_positive CHECK(age > 0)
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

    CONSTRAINT pkey_bookmarks PRIMARY KEY(student_id, mcq_id),
    CONSTRAINT fkey_bookmarks_mcqbank FOREIGN KEY(mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_bookmarks_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- CREATE TABLE incorrect_mcqs(
--     student_id INT NOT NULL,
--     mcq_id INT NOT NULL,
--     selected_option CHAR(1) NOT NULL,
--     CONSTRAINT pkey_incorrectmcqs PRIMARY KEY(student_id, mcq_id),
--     CONSTRAINT fkey_incorrectmcqs_mcqbank FOREIGN KEY(mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE,
--     CONSTRAINT fkey_incorrectmcqs_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
-- );

CREATE TABLE attempted_mcqs(
    student_id INT NOT NULL,
    mcq_id INT NOT NULL,
    selected_option CHAR(1) NOT NULL,
    -- What should happen when a user corrects the previously wronged mcq or vice versa? 
    CONSTRAINT pkey_attemptedmcqs PRIMARY KEY(student_id, mcq_id),
    CONSTRAINT fkey_attemptedmcqs_mcqbank FOREIGN KEY(mcq_id) REFERENCES mcq_bank(mcq_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fkey_attemptedmcqs_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE activity(
    activity_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    attempt_count INT NOT NULL,
    correct_count INT NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE, 
    CONSTRAINT attempt_count_non_negative CHECK(attempt_count >= 0),
    CONSTRAINT correct_count_non_negative CHECK(correct_count >= 0),
    CONSTRAINT fkey_activity_student FOREIGN KEY(student_id) REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE CASCADE
);


-- QUERY FOR WEAK TOPICS
SELECT topics.topic_name,
       chapters.chapter_name,
       subjects.subject_name,
       ROUND(((
            SELECT COUNT(*) 
            FROM attempted_mcqs inner_attempted_mcqs
            INNER JOIN mcq_bank inner_mcq_bank ON inner_mcq_bank.mcq_id=inner_attempted_mcqs.mcq_id 
            WHERE inner_attempted_mcqs.student_id=1 AND inner_attempted_mcqs.selected_option=inner_mcq_bank.correct_option 
                               AND inner_mcq_bank.topic_id=outer_mcq_bank.topic_id
       )*100) /
       (
            SELECT COUNT(*) 
            FROM attempted_mcqs inner_attempted_mcqs
            INNER JOIN mcq_bank inner_mcq_bank ON inner_mcq_bank.mcq_id=inner_attempted_mcqs.mcq_id 
            WHERE inner_attempted_mcqs.student_id=1 AND inner_mcq_bank.topic_id=outer_mcq_bank.topic_id
       )) AS accuracy
FROM attempted_mcqs outer_attempted_mcqs
INNER JOIN mcq_bank outer_mcq_bank ON outer_mcq_bank.mcq_id=outer_attempted_mcqs.mcq_id
INNER JOIN topics ON outer_mcq_bank.topic_id=topics.topic_id
INNER JOIN chapters ON outer_mcq_bank.chapter_id=chapters.chapter_id
INNER JOIN subjects ON outer_mcq_bank.subject_id=subjects.subject_id
WHERE outer_attempted_mcqs.student_id=1
GROUP BY outer_mcq_bank.topic_id, topic_name, chapter_name, subject_name
ORDER BY accuracy ASC
LIMIT 4;

-- Optimized:
SELECT topics.topic_name,
       chapters.chapter_name,
       subjects.subject_name,
       ROUND(SUM(
            CASE
                WHEN outer_attempted_mcqs.selected_option=outer_mcq_bank.correct_option THEN 1
                ELSE 0
            END)*100 /
       (COUNT(*))) AS accuracy
FROM attempted_mcqs outer_attempted_mcqs
INNER JOIN mcq_bank outer_mcq_bank ON outer_mcq_bank.mcq_id=outer_attempted_mcqs.mcq_id
INNER JOIN topics ON outer_mcq_bank.topic_id=topics.topic_id
INNER JOIN chapters ON outer_mcq_bank.chapter_id=chapters.chapter_id
INNER JOIN subjects ON outer_mcq_bank.subject_id=subjects.subject_id
WHERE outer_attempted_mcqs.student_id=1
GROUP BY outer_mcq_bank.topic_id, topic_name, chapter_name, subject_name
ORDER BY accuracy ASC
LIMIT 4;