const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const mysql2 = require("mysql2");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const secretKey =
  process.env.SECRET_KEY || "gV2$r9^uLpQw3ZtYxYzA#dG!kLmNp3s6v9y/B?E";

const db = mysql2.createPool({
  host: "sql.freedb.tech",
  user: "freedb_hueco",
  password: "?WmvH3c$&E8TsUZ",
  database: "thesis2",
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "strangebanning@gmail.com",
    pass: "baln lppq bdpx ttwq",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// CORS CONFIGURATION
const corsOptions = {
  origin: [/https:\/\/th-speak\.vercel\.app($|\/.*)/], // Regex to match the origin and any subpaths
  methods: "GET,PUT,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Login into user account start
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }

  const query =
    "SELECT * FROM user_account WHERE username = ? AND password = ?";

  db.query(query, [username, password], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (results.length === 1) {
      const user = results[0];
      const token = jwt.sign({ userId: user.UserID }, secretKey);
      return res
        .status(200)
        .json({ message: "Login successful", userId: user.UserID, token });
    } else {
      return res.status(401).json({ error: "Invalid username or password." });
    }
  });
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token not provided" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.userId = decoded.userId;
    next();
  });
};

app.get("/api/getUserId", verifyToken, (req, res) => {
  const userId = req.userId;
  res.status(200).json({ userId });
});

// Login into user account end

// REGISTER NEW USER START //
function generateRandomAccountNumber() {
  const numbers = "0123456789";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let randomAccountNumber = "";

  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * numbers.length);
    randomAccountNumber += numbers.charAt(randomIndex);
  }

  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomAccountNumber += letters.charAt(randomIndex);
  }

  randomAccountNumber = randomAccountNumber
    .split("")
    .sort(function () {
      return 0.5 - Math.random();
    })
    .join("");

  return randomAccountNumber;
}

app.post("/api/insert", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;

  const sqlInsert =
    "INSERT INTO user_account (UserID, username, password) VALUES (?,?,?)";

  const randomAccountNumber = generateRandomAccountNumber();

  db.query(
    sqlInsert,
    [randomAccountNumber, username, password],
    (err, result) => {
      if (err) {
        console.log(err);
        res
          .status(500)
          .send("Request failed, error inserting data into the database.");
      } else {
        console.log("Data inserted successfully");
        res.status(200).json({ generatedUserID: randomAccountNumber });

        transporter.sendMail(
          {
            from: "strangebanning@gmail.com",
            to: email,
            subject: "Registration Successful",
            text: `Thank you for registering!\n\nYour login credentials:\nEmail: ${username}\nPassword: ${password}`,
          },
          (error, info) => {
            if (error) {
              console.error("Error sending email:", error);
            } else {
              console.log("Email sent:", info.response);
            }
          }
        );
      }
    }
  );
});

// REGISTER NEW USER START //

// Insert New Section Start //

app.post("/api/insection", (req, res) => {
  const sname = req.body.sname;
  const userID = req.body.userID;

  const sqlInsert = "INSERT INTO section_list (sname, UserID) VALUES (?, ?)";

  db.query(sqlInsert, [sname, userID], (err, result) => {
    if (err) {
      console.log(err);
      res
        .status(500)
        .send("Request failed, error inserting data into the database.");
    } else {
      console.log("Data inserted successfully.");
      res.status(200).send("Data inserted successfully.");
    }
  });
});
// Insert New Section END //

// Fetch Data to Table Start //
app.get("/api/sectionList", verifyToken, (req, res) => {
  const userId = req.userId;

  const sqlSelect = "SELECT * FROM section_list WHERE UserID = ?";
  db.query(sqlSelect, [userId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching section data");
    } else {
      res.status(200).json(results);
    }
  });
});
// Fetch Data to Table End //

// Update Data in Table Start //
app.put("/api/updateSName", (req, res) => {
  const sname = req.body.sname;
  const newSName = req.body.newSName;

  const sqlUpdate = "UPDATE section_list SET sname = ? WHERE sname = ?";

  console.log("SQL Query:", sqlUpdate);
  console.log("Parameters:", [newSName, sname]);

  db.query(sqlUpdate, [newSName, sname], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Request failed, error updating name in database.");
    } else {
      if (result.affectedRows > 0) {
        console.log("Name updated successfully.");
        res.status(200).send("Name updated successfully.");
      } else {
        res.status(404).send("Record not found");
      }
    }
  });
});
// Update Data in Table End //

// Delete Data in Table Start //
app.delete("/api/deleteSection/:sectionName", (req, res) => {
  const sectionName = req.params.sectionName;
  const sqlDelete = "DELETE FROM section_list WHERE sname = ?";

  db.query(sqlDelete, [sectionName], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Request failed, error deleting section.");
    } else {
      if (result.affectedRows > 0) {
        console.log("Section deleted successfully.");
        res.status(204).send();
      } else {
        res.status(404).send("Section not found");
      }
    }
  });
});
// Delete Data in Table End //

// Add New Student on List Start
app.post("/api/students", async (req, res) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const sectionID = req.body.sectionID;

  // Inserting new student
  const sqlInsertStudent =
    "INSERT INTO student_list (firstName, lastName, sectionID) VALUES (?, ?, ?)";

  db.query(
    sqlInsertStudent,
    [firstName, lastName, sectionID],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error inserting student data.");
      }

      console.log("Student added successfully.");

      // Get the student ID of the newly inserted student
      const studentID = result.insertId;

      // Generate and insert graph entry
      const sqlInsertGraph =
        "INSERT INTO graph_table (score, number_of_quizzes, id) VALUES (?, ?, ?)";

      // You can customize the default values for score and number_of_quizzes
      const defaultScore = 0;
      const defaultNumberOfQuizzes = 0;

      db.query(
        sqlInsertGraph,
        [defaultScore, defaultNumberOfQuizzes, studentID],
        (graphErr, graphResult) => {
          if (graphErr) {
            console.error(graphErr);
            return res.status(500).send("Error inserting graph data.");
          }

          console.log("Graph entry added successfully."); // Log success
          return res
            .status(200)
            .send("Student and graph entry added successfully.");
        }
      );
    }
  );
});
// Add New Student on List End

// Update Student on List Start //
app.put("/api/studentData/:id", (req, res) => {
  const id = req.params.id;
  const { firstName, lastName, sectionID } = req.body;

  const sqlUpdate =
    "UPDATE student_list SET firstName = ?, lastName = ?, sectionID = ? WHERE id = ?";

  console.log("SQL Query:", sqlUpdate);
  console.log("Parameters:", [firstName, lastName, sectionID, id]);

  db.query(sqlUpdate, [firstName, lastName, sectionID, id], (err, result) => {
    if (err) {
      console.log(err);
      res
        .status(500)
        .send("Request failed, error updating record in the database.");
    } else {
      if (result.affectedRows > 0) {
        console.log("Record updated successfully.");
        res.status(200).send("Record updated successfully.");
      } else {
        res.status(404).send("Record not found");
      }
    }
  });
});
// Update Student on List End //

// Delete Student on List Start //
app.delete("/api/studentData/:id", async (req, res) => {
  const id = req.params.id;

  // Fetch the student record to get the associated graph data ID
  const sqlFetch = "SELECT * FROM student_list WHERE id = ?";
  db.query(sqlFetch, [id], async (err, studentResult) => {
    if (err) {
      console.error(err);
      res.status(500).send("Request failed, error fetching student.");
    } else {
      if (studentResult.length > 0) {
        const student = studentResult[0];

        // Assuming graph_data table has a foreign key student_id
        const graphDataId = student.graphDataId; // Adjust the column name as per your schema

        // Delete the associated graph data first
        const sqlDeleteGraphData = "DELETE FROM graph_table WHERE id = ?";
        db.query(
          sqlDeleteGraphData,
          [graphDataId],
          (err, graphDataDeleteResult) => {
            if (err) {
              console.error(err);
              res
                .status(500)
                .send("Request failed, error deleting graph data.");
            } else {
              // Now, delete the student record
              const sqlDeleteStudent = "DELETE FROM student_list WHERE id = ?";
              db.query(sqlDeleteStudent, [id], (err, studentDeleteResult) => {
                if (err) {
                  console.error(err);
                  res
                    .status(500)
                    .send("Request failed, error deleting student.");
                } else {
                  if (studentDeleteResult.affectedRows > 0) {
                    console.log("Student record deleted successfully.");
                    res
                      .status(200)
                      .send(
                        "Student and associated graph data deleted successfully."
                      );
                  } else {
                    res.status(404).send("Student record not found");
                  }
                }
              });
            }
          }
        );
      } else {
        res.status(404).send("Student record not found");
      }
    }
  });
});
// Delete Student on List End //

// UPDATE TOTAL SCORE START //
app.post("/api/updateTotalScore", (req, res) => {
  const { studentID, newScore } = req.body;
  console.log(
    "Received request to update total_score for student ID:",
    studentID
  );

  const sqlSelectTotalScore =
    "SELECT total_score, initial_grade FROM student_list WHERE id = ?";
  db.query(sqlSelectTotalScore, [studentID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching current total_score");
    } else {
      const currentTotalScore = results[0].total_score;
      const updatedTotalScore = currentTotalScore + newScore;

      // Calculate percentage
      const percentage = ((updatedTotalScore / 120) * 100).toFixed(2);
      console.log("Percentage to update:", percentage);

      // Check if initial_grade is null and update it
      let initialGrade = results[0].initial_grade;
      if (initialGrade === null) {
        initialGrade = percentage;
      }

      const sqlUpdate =
        "UPDATE student_list SET total_score = ?, initial_grade = ? WHERE id = ?";
      db.query(
        sqlUpdate,
        [updatedTotalScore, initialGrade, studentID],
        (err, updateResults) => {
          if (err) {
            console.error(err);
            res
              .status(500)
              .send("Error updating total_score and initial_grade");
          } else {
            console.log("Total score and initial_grade updated successfully");
            res
              .status(200)
              .send("Total score and initial_grade updated successfully");
          }
        }
      );
    }
  });
});
// UPDATE TOTAL SCORE END //

// FETCHING A SINGLE STUDENT START //
app.get("/api/student", (req, res) => {
  const studentID = req.query.studentID;
  console.log("Received studentID:", studentID);

  const sqlSelect =
    "SELECT id, firstName, lastName, total_score FROM student_list WHERE id = ?";

  db.query(sqlSelect, [studentID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching student data");
    } else {
      console.log("Query results:", results);

      const studentData = results[0];
      const enhancedStudentData = {
        ...studentData,
        studentID: studentData.id,
      };

      res.status(200).json(enhancedStudentData);
    }
  });
});
// FETCHING A SINGLE STUDENT END //

// Display Student Data to Table Start //
app.get("/api/studentList", (req, res) => {
  const sectionID = req.query.sectionID;
  console.log("Received sectionID:", sectionID);

  const sqlSelect = "SELECT * FROM student_list WHERE sectionID = ?";

  db.query(sqlSelect, [sectionID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching student data");
    } else {
      console.log("Query results:", results);
      res.status(200).json(results);
    }
  });
});

// Display Student Data to Table End //

// Fetching Database Stored Words Start //
app.get("/api/wordData", (req, res) => {
  const query = "SELECT word FROM words ORDER BY RAND() LIMIT 10";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data from MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const words = results.map((row) => row.word);
      console.log("Word data retrieved:", words);
      res.json(words);
    }
  });
});
// Fetching Database Stored Words End //

// Fetching Database Stored Normal LVL Words Start //
app.get("/api/wordDataNorm", (req, res) => {
  const query = "SELECT word FROM word_normal ORDER BY RAND() LIMIT 10";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data from MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const words = results.map((row) => row.word);
      console.log("Word data retrieved:", words);
      res.json(words);
    }
  });
});
// Fetching Database Stored Words End //

// Fetching Database Stored Normal LVL Words Start //
app.get("/api/wordDataHard", (req, res) => {
  const query = "SELECT word FROM word_hard ORDER BY RAND() LIMIT 10";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data from MySQL:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const words = results.map((row) => row.word);
      console.log("Word data retrieved:", words);
      res.json(words);
    }
  });
});
// Fetching Database Stored Words End //

// FETCH ID AND TITLE FROM STORIES TABLE START //
app.get("/get-stories", verifyToken, (req, res) => {
  const userId = req.userId; // Fetching user ID from the token

  console.log("Fetching stories for UserID:", userId); // Log the user ID for debugging

  db.query(
    "SELECT stories_id, title FROM stories_table WHERE UserID = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error fetching stories:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      }

      console.log("Fetched stories:", results); // Log the fetched stories for debugging

      res.status(200).json(results);
    }
  );
});

// FETCH ID AND TITLE FROM STORIES TABLE END //

// ADD STORY AND WORDS TO DATABASE START //
app.post("/submit-story", verifyToken, (req, res) => {
  const { title, content, addedWords } = req.body;

  const userId = req.userId;

  console.log("User ID:", userId);

  const getUserIdQuery = "SELECT UserID FROM user_account WHERE UserID = ?";

  db.query(getUserIdQuery, [userId], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (results.length === 1) {
      db.query(
        "INSERT INTO stories_table (title, content, UserID) VALUES (?, ?, ?)",
        [title, content, userId],
        (err, results) => {
          if (err) {
            console.error("Error inserting story:", err);
            return res.status(500).json({ message: "Internal Server Error" });
          }

          const storyId = results.insertId;

          const proWords = addedWords.map((word) => [word, storyId]);
          db.query(
            "INSERT INTO pro_table (word, stories_id) VALUES ?",
            [proWords],
            (err) => {
              if (err) {
                console.error("Error inserting words:", err);
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }

              console.log("Story submitted successfully. Story ID:", storyId);
              res
                .status(201)
                .json({ message: "Story submitted successfully." });
            }
          );
        }
      );
    } else {
      return res.status(401).json({ error: "Unauthorized: Invalid user" });
    }
  });
});

// ADD STORY AND WORDS TO DATABASE END //

// DELETE STORIES FROM DATABASE START //
app.delete("/delete-story/:storyId", (req, res) => {
  const storyId = req.params.storyId;

  if (storyId === undefined) {
    return res.status(400).json({ message: "Invalid story ID" });
  }

  db.query("DELETE FROM pro_table WHERE stories_id = ?", [storyId], (err) => {
    if (err) {
      console.error("Error deleting words:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    db.query(
      "DELETE FROM stories_table WHERE stories_id = ?",
      [storyId],
      (err, results) => {
        if (err) {
          console.error("Error deleting story:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Story not found" });
        }

        res.status(200).json({ message: "Story deleted successfully." });
      }
    );
  });
});
// DELETE STORIES FROM DATABASE END //

// FETCHING STUDENT FOR EXAMINATION START //
app.get("/api/studentExam", (req, res) => {
  const studentID = req.query.studentID;
  console.log("Received studentID:", studentID);

  const sqlSelect =
    "SELECT id, firstName, lastName FROM student_list WHERE id = ?";

  db.query(sqlSelect, [studentID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching student data");
    } else {
      console.log("Query results:", results);

      if (results.length === 0) {
        res.status(404).send("Student not found");
      } else {
        const studentData = results[0];
        const enhancedStudentData = {
          ...studentData,
          studentID: studentData.id,
        };

        res.status(200).json(enhancedStudentData);
      }
    }
  });
});
// FETCHING STUDENT FOR EXAMINATION END //

// FETCH STORY AND WORDS START //
app.get("/fetch-story/:storyId", (req, res) => {
  const storyId = req.params.storyId;

  db.query(
    "SELECT title, content FROM stories_table WHERE stories_id = ?",
    [storyId],
    (err, storyResults) => {
      if (err) {
        console.error("Error fetching story details:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (!storyResults || storyResults.length === 0) {
        console.log("No results found for story ID:", storyId);
        return res.status(404).json({ message: "No results found" });
      }

      db.query(
        "SELECT word FROM pro_table WHERE stories_id = ?",
        [storyId],
        (err, wordResults) => {
          if (err) {
            console.error("Error fetching words:", err);
            return res.status(500).json({ message: "Internal Server Error" });
          }

          const storyDetails = {
            title: storyResults[0].title,
            content: storyResults[0].content,
            words: wordResults.map((word) => word.word),
          };

          res.status(200).json(storyDetails);
        }
      );
    }
  );
});

// FETCH STORY AND WORDS END //

// SUBMIT SCORE TO DATABASE START //
app.post("/api/submitScore", (req, res) => {
  const { studentID, totalScore } = req.body;
  console.log("Received score submission:", { studentID, totalScore });

  const sqlGetNumberOfQuizzes =
    "SELECT number_of_quizzes FROM graph_table WHERE id = ? ORDER BY graph_id DESC LIMIT 1";

  db.query(sqlGetNumberOfQuizzes, [studentID], (err, result) => {
    if (err) {
      console.error("Error retrieving number of quizzes:", err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const currentNumberOfQuizzes =
      result.length > 0 ? result[0].number_of_quizzes : 0;

    const newNumberOfQuizzes = currentNumberOfQuizzes + 1;

    const sqlInsertScore =
      "INSERT INTO graph_table (score, number_of_quizzes, id) VALUES (?, ?, ?)";
    console.log("SQL Query:", sqlInsertScore, [
      totalScore,
      newNumberOfQuizzes,
      studentID,
    ]);

    db.query(
      sqlInsertScore,
      [totalScore, newNumberOfQuizzes, studentID],
      (err, result) => {
        if (err) {
          console.error("Error inserting score:", err);
          res.status(500).send("Internal Server Error");
          return;
        }

        // After inserting the new score, update the total_score using a temporary table
        const sqlUpdateTotalScore =
          "UPDATE graph_table, (SELECT id, SUM(score) AS total_score FROM (SELECT * FROM graph_table ORDER BY graph_id DESC) AS temp WHERE id = ? GROUP BY id) AS temp2 SET graph_table.total_score = temp2.total_score, graph_table.intl_grade = (temp2.total_score / (SELECT COUNT(*) FROM pro_table)) * 100 WHERE graph_table.id = temp2.id";
        console.log("SQL Query:", sqlUpdateTotalScore, [studentID]);

        db.query(sqlUpdateTotalScore, [studentID], (err, result) => {
          if (err) {
            console.error("Error updating total score and initial grade:", err);
            res.status(500).send("Internal Server Error");
            return;
          }

          // Count the number of words in the pro_table
          const sqlGetWordCount =
            "SELECT COUNT(*) AS word_count FROM pro_table";
          db.query(sqlGetWordCount, (err, wordResult) => {
            if (err) {
              console.error("Error retrieving word count:", err);
              res.status(500).send("Internal Server Error");
              return;
            }

            const wordCount =
              wordResult.length > 0 ? wordResult[0].word_count : 0;
            console.log("Word count in pro_table:", wordCount);

            res.status(200).send("Score submitted successfully.");
          });
        });
      }
    );
  });
});

// SUBMIT SCORE TO DATABASE END //

// FETCH DATA FOR GRAPH START //
app.get("/api/getGraphData", async (req, res) => {
  const studentID = req.query.studentID;

  try {
    const sqlFetchGraphData =
      "SELECT number_of_quizzes, score FROM graph_table WHERE id = ? ORDER BY number_of_quizzes";

    db.query(sqlFetchGraphData, [studentID], (err, result) => {
      if (err) {
        console.error("Error fetching graph data:", err);
        res.status(500).send("Internal Server Error");
      } else {
        res.status(200).json(result);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// FETCH DATA FOR GRAPH END //

// COMPUTE FINAL GRADE START //
// Function to scale the initial grade based on the specified conditions
function scaleInitialGrade(initialGrade, scale) {
  // Ensure initial grade is within the range of 0 to 100
  return (initialGrade / scale) * 100;
}

// Function to compute the final grade for a student
function computeFinalGrade(initialGradeStudentList, initialGradeGraphTable) {
  // Scale the initial grades to fit within the range of 0 to 100
  const scaledInitialGradeStudentList = scaleInitialGrade(
    initialGradeStudentList,
    120
  );
  const scaledInitialGradeGraphTable = scaleInitialGrade(
    initialGradeGraphTable,
    100
  );

  // Calculate the final grade using the proportional method
  const finalGrade =
    (scaledInitialGradeStudentList + scaledInitialGradeGraphTable) / 2;

  return finalGrade;
}

// Backend API to compute final grade for each student
app.get("/api/computeFinalGrades", async (req, res) => {
  try {
    // Fetch all students
    const [students] = await db.promise().query("SELECT * FROM student_list");

    // Iterate over each student to compute final grade
    for (const student of students) {
      try {
        // Fetch initial grades from student_list and graph_table
        const [studentResult] = await db
          .promise()
          .query("SELECT initial_grade FROM student_list WHERE id = ?", [
            student.id,
          ]);
        const [graphResult] = await db
          .promise()
          .query("SELECT intl_grade FROM graph_table WHERE id = ?", [
            student.id,
          ]);

        // Compute final grade
        const finalGrade = computeFinalGrade(
          studentResult[0].initial_grade,
          graphResult[0].intl_grade
        );

        // Update final grade in the database
        await db
          .promise()
          .query("UPDATE student_list SET final_grade = ? WHERE id = ?", [
            finalGrade,
            student.id,
          ]);
      } catch (error) {
        console.error("Error computing final grade for student:", error);
      }
    }

    res.status(200).send("Final grades computed and updated successfully.");
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3001, () => {
  console.log("Server is running on Port 3001");
});
