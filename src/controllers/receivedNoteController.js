// src/controllers/receivedNoteController.js
import connection from '../config/database.js';
import ReceivedNoteDetailsController from './ReceivedNoteDetailsController.js';

// Lấy danh sách tất cả các phiếu nhập
const getReceivedNotes = async (req, res) => {
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the SELECT query
      // const [rows] = await connection.query('SELECT * FROM ReceivedNotes');
      const [rows] = await connection.query(
         'SELECT rn.received_note_id, rn.employee_id, rn.supplier_id, rn.received_date, SUM(rnd.quantity * rnd.price) AS total_price FROM ReceivedNotes rn JOIN ReceivedNoteDetails rnd ON rn.received_note_id = rnd.received_note_id GROUP BY rn.received_note_id;'
      );

      // Commit the transaction (even though no changes are made, it finalizes the read operation)
      await connection.commit();

      // Send the result
      console.log(rows);
      res.json(rows);
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).send('Error fetching received notes');
   }
};

// Lấy danh sách phiếu nhập theo Id
const getReceivedNoteById = async (req, res) => {
   const { received_note_id } = req.params;
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the SELECT query within the transaction
      const [rows] = await connection.query(
         'SELECT * FROM ReceivedNotes WHERE received_note_id = ?',
         [received_note_id]
      );

      if (rows.length === 0) {
         await connection.rollback(); // Rollback in case of not found to keep transaction clean
         return res.status(404).send('Received note not found');
      }

      // Commit the transaction after a successful fetch
      await connection.commit();

      // Send the result
      res.json(rows[0]);
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).send('Error fetching received note');
   }
};

const createReceivedNote = async (req, res) => {
   const { employee_id, supplier_id, received_date } = req.body;
   try {
      // Start a new transaction
      await connection.beginTransaction();

      // Get the last received_note_id to generate the new one
      let uniqueIdFound = false;
      let count = 1;

      // Loop until a unique received_note_id is found
      // while (!uniqueIdFound) {
      //    // Generate the new received_note_id
      //    newId = `RN${count.toString().padStart(2, '0')}`;
      //    console.log(newId);

      //    // Check if this newId already exists in the database
      //    const [existingNote] = await connection.query(
      //       'SELECT received_note_id FROM ReceivedNotes WHERE received_note_id = ?',
      //       [newId]
      //    );

      //    // If the ID does not exist, it's unique
      //    if (existingNote.length === 0) {
      //       uniqueIdFound = true;
      //    } else {
      //       // If the ID exists, increment the count and try again
      //       count++;
      //    }
      //    console.log(count);
      // }
      let [id] = await connection.query(
         'SELECT received_note_id FROM ReceivedNotes'
      );
      id = id.map((v) => v.received_note_id);
      const maxId = Math.max(...id.map((e) => parseInt(e.slice(2), 10)));
      const newId = `RN${String(maxId + 1).padStart(2, '0')}`;

      // Insert the new received note into the database
      await connection.query(
         'INSERT INTO ReceivedNotes (received_note_id, employee_id, supplier_id, received_date) VALUES (?, ?, ?, ?)',
         [newId, employee_id, supplier_id, received_date]
      );

      // Commit the transaction
      await connection.commit();
      res.status(201).json({ received_note_id: newId });
   } catch (error) {
      // If there's an error, rollback the transaction
      if (connection) await connection.rollback();
      res.status(500).json(error);
   }
};

// Cập nhật thông tin một phiếu nhập
const updateReceivedNote = async (req, res) => {
   const { received_note_id } = req.params;
   const { employee_id, supplier_id, received_date } = req.body;
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Perform the update operation
      const [result] = await connection.query(
         'UPDATE ReceivedNotes SET employee_id = ?, supplier_id = ?, received_date = ? WHERE received_note_id = ?',
         [employee_id, supplier_id, received_date, received_note_id]
      );

      if (result.affectedRows === 0) {
         // Rollback transaction if no rows were affected
         await connection.rollback();
         return res.status(404).send('Received note not found');
      }

      // Commit the transaction if update is successful
      await connection.commit();
      res.status(200).send('Received note updated successfully');
   } catch (error) {
      // Rollback transaction in case of an error
      if (connection) await connection.rollback();

      res.status(500).json(error);
   }
};

// Xóa một phiếu nhập theo ID
const deleteReceivedNote = async (req, res) => {
   const { received_note_id } = req.params;
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Perform the delete operation
      const [result] = await connection.query(
         'DELETE FROM ReceivedNotes WHERE received_note_id = ?',
         [received_note_id]
      );

      if (result.affectedRows === 0) {
         // Rollback transaction if no rows were affected
         await connection.rollback();
         return res.status(404).send('Received note not found');
      }

      // Commit the transaction if delete is successful
      await connection.commit();
      res.status(200).send('Received note deleted successfully');
   } catch (error) {
      // Rollback transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).send('Error deleting received note');
   }
};

export default {
   getReceivedNotes,
   getReceivedNoteById,
   createReceivedNote,
   updateReceivedNote,
   deleteReceivedNote,
};
