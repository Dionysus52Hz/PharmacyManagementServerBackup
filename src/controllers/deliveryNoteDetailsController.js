import connection from '../config/database.js';

const getAllDeliveryNoteDetails = async (req, res) => {
   try {
      // Start the transaction
      await connection.beginTransaction();

      // Execute the SELECT query
      const [rows] = await connection.query(
         'SELECT * FROM DeliveryNoteDetails'
      );

      // Commit the transaction (optional for SELECT queries)
      await connection.commit();

      // Send the response with the data
      res.status(200).json(rows);
   } catch (error) {
      // Rollback the transaction in case of any error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }
};

const getDeliveryNoteDetailById = async (req, res) => {
   try {
      const { delivery_note_id } = req.params;

      // Start the transaction
      await connection.beginTransaction();

      // Truy vấn tất cả các bản ghi cùng delivery_note_id
      const query = `
            SELECT delivery_note_id, dnd.medicine_id, m.name as medicine_name, dnd.quantity, dnd.price FROM DeliveryNoteDetails dnd JOIN Medicine m ON dnd.medicine_id = m.medicine_id WHERE delivery_note_id = ?;
        `;
      const [details] = await connection.query(query, [delivery_note_id]);

      if (details.length === 0) {
         return res
            .status(404)
            .json({ message: 'No details found for this delivery note ID' });
      }

      // Commit the transaction (optional for SELECT queries)
      await connection.commit();

      // Trả về liệt kê của các delivery_note có cùng delivery_note_id
      res.json({ delivery_note_id, details });
   } catch (error) {
      // Rollback the transaction in case of any error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Server error' });
   }
};

const createDeliveryNoteDetail = async (req, res) => {
   const { delivery_note_id, medicine_id, quantity, price } = req.body;
   try {
      // Start the transaction
      await connection.beginTransaction();

      // Execute the insert query
      await connection.query(
         'INSERT INTO DeliveryNoteDetails (delivery_note_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)',
         [delivery_note_id, medicine_id, quantity, price]
      );

      // Commit the transaction
      await connection.commit();

      // Respond with a success message
      res.status(201).json({ message: 'Delivery Note Detail created' });
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Error creating delivery note detail' });
   }
};

const updateDeliveryNoteDetail = async (req, res) => {
   const { delivery_note_id, medicine_id } = req.params;
   const { quantity, price } = req.body;
   try {
      // Start the transaction
      await connection.beginTransaction();

      // Execute the update query
      const [result] = await connection.query(
         'UPDATE DeliveryNoteDetails SET quantity = ?, price = ? WHERE delivery_note_id = ? AND medicine_id = ?',
         [quantity, price, delivery_note_id, medicine_id]
      );

      // Check if any rows were updated
      if (result.affectedRows === 0) {
         // If no rows were affected, it means the delivery note was not found
         return res
            .status(404)
            .json({ message: 'Delivery note detail not found' });
      }

      // Commit the transaction
      await connection.commit();

      // Respond with a success message
      res.status(200).json({ message: 'Delivery Note Detail updated' });
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Error updating delivery note detail' });
   }
};

const deleteDeliveryNoteDetail = async (req, res) => {
   const { delivery_note_id, medicine_id } = req.params;
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the delete query
      const [result] = await connection.query(
         'DELETE FROM DeliveryNoteDetails WHERE delivery_note_id = ? AND medicine_id = ?',
         [delivery_note_id, medicine_id]
      );

      // Check if any rows were affected
      if (result.affectedRows === 0) {
         // If no rows were affected, it means the delivery note detail was not found
         await connection.rollback();
         return res
            .status(404)
            .json({ message: 'Delivery note detail not found' });
      }

      // Commit the transaction
      await connection.commit();

      // Send success response
      res.status(200).json({ message: 'Delivery Note Detail deleted' });
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: 'Error deleting delivery note detail' });
   }
};

export default {
   getAllDeliveryNoteDetails,
   getDeliveryNoteDetailById,
   createDeliveryNoteDetail,
   updateDeliveryNoteDetail,
   deleteDeliveryNoteDetail,
};
