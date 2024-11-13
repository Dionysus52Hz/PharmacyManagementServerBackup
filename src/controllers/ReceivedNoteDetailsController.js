import connection from '../config/database.js';

const getAllReceivedNoteDetails = async (req, res) => {
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the query
      const [rows] = await connection.query(
         'SELECT * FROM ReceivedNoteDetails'
      );

      // Commit the transaction
      await connection.commit();

      // Send the response
      res.status(200).json(rows);
   } catch (error) {
      // Rollback transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Error fetching received note details' });
   }
};

const getReceivedNoteDetailById = async (req, res) => {
   try {
      const { received_note_id } = req.params;
      // Start a transaction
      await connection.beginTransaction();

      // Query to get all records with the same received_note_id
      const query = `
            SELECT received_note_id, rnd.medicine_id, m.name as medicine_name, rnd.quantity, rnd.price FROM ReceivedNoteDetails rnd JOIN Medicine m ON rnd.medicine_id = m.medicine_id WHERE received_note_id = ?;
        `;
      const [details] = await connection.query(query, [received_note_id]);

      if (details.length === 0) {
         // If no records found, rollback and return a 404 response
         await connection.rollback();
         return res
            .status(404)
            .json({ message: 'No details found for this received note ID' });
      }

      // Commit the transaction
      await connection.commit();

      // Send the response with the list of records
      console.log({ received_note_id, details });
      res.json({ received_note_id, details });
   } catch (error) {
      // Rollback transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Server error' });
   }
};

const createReceivedNoteDetail = async (req, res) => {
   try {
      const { received_note_id, medicine_id, quantity, price } = req.body;
      await connection.beginTransaction();

      // Insert the new record into ReceivedNoteDetails within the transaction
      await connection.query(
         'INSERT INTO ReceivedNoteDetails (received_note_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)',
         [received_note_id, medicine_id, quantity, price]
      );

      // Commit the transaction
      await connection.commit();
      res.status(201).json({
         message: 'Chi tiết nhập kho đã được thêm thành công',
      });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }
};

const updateReceivedNoteDetail = async (req, res) => {
   try {
      const { received_note_id, medicine_id } = req.params;
      const { quantity, price } = req.body;
      await connection.beginTransaction();

      // Execute the update query within the transaction
      const [result] = await connection.query(
         'UPDATE ReceivedNoteDetails SET quantity = ?, price = ? WHERE received_note_id = ? AND medicine_id = ?',
         [quantity, price, received_note_id, medicine_id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the entry doesn't exist
         await connection.rollback();
         return res.status(404).json({ message: 'Chi tiết không tồn tại' });
      }

      // Commit the transaction if the update is successful
      await connection.commit();
      res.status(200).json({ message: 'Chi tiết nhập kho đã được cập nhật' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }
};

const deleteReceivedNoteDetail = async (req, res) => {
   try {
      const { received_note_id, medicine_id } = req.params;
      await connection.beginTransaction();

      // Execute the delete query within the transaction
      const [result] = await connection.query(
         'DELETE FROM ReceivedNoteDetails WHERE received_note_id = ? AND medicine_id = ?',
         [received_note_id, medicine_id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the detail doesn't exist
         await connection.rollback();
         return res.status(404).json({ message: 'Chi tiết không tồn tại' });
      }

      // Commit the transaction if the delete is successful
      await connection.commit();
      res.status(200).json({ message: 'Chi tiết nhập kho đã được xóa' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }
};

export default {
   getAllReceivedNoteDetails,
   getReceivedNoteDetailById,
   createReceivedNoteDetail,
   updateReceivedNoteDetail,
   deleteReceivedNoteDetail,
};
