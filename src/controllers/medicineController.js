// src/controllers/medicineController.js
import connection from '../config/database.js';

// Lấy danh sách tất cả các loại thuốc
const getMedicines = async (req, res) => {
   try {
      await connection.beginTransaction(); // Bắt đầu transaction

      const [rows] = await connection.query('SELECT * FROM Medicine');

      await connection.commit(); // Commit transaction khi thành công
      res.json(rows);
   } catch (error) {
      await connection.rollback(); // Rollback transaction khi có lỗi
      res.status(500).send('Error fetching medicines');
   }
};

// Lấy chi tiết một loại thuốc theo ID
const getMedicineById = async (req, res) => {
   const { medicine_id } = req.params;
   try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
         'SELECT * FROM Medicine WHERE medicine_id = ?',
         [medicine_id]
      );
      if (rows.length === 0) {
         await connection.rollback();
         return res.status(404).send('Medicine not found');
      }

      await connection.commit();
      res.json(rows[0]);
   } catch (error) {
      await connection.rollback();
      res.status(500).send('Error fetching medicine');
   }
};

// Tạo mới một loại thuốc
const createMedicine = async (req, res) => {
   const {
      medicine_id,
      name,
      manufacturer_id,
      supplier_id,
      effects,
      category_id,
      quantity,
      price,
   } = req.body;
   try {
      await connection.beginTransaction();

      const [result] = await connection.query(
         'INSERT INTO Medicine (medicine_id, name, manufacturer_id, supplier_id, effects, category_id, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
         [
            medicine_id,
            name,
            manufacturer_id,
            supplier_id,
            effects,
            category_id,
            quantity,
            price,
         ]
      );

      await connection.commit();
      // res.status(201).json({ medicine_id: result.insertId });
      res.status(200).send('Medicine create successfully');
   } catch (error) {
      await connection.rollback();
      res.status(500).json(error);
   }
};

// Cập nhật thông tin một loại thuốc
const updateMedicine = async (req, res) => {
   const { medicine_id } = req.params;
   const {
      name,
      manufacturer_id,
      supplier_id,
      effects,
      category_id,
      price,
      quantity,
   } = req.body;
   try {
      await connection.beginTransaction();

      const [result] = await connection.query(
         'UPDATE Medicine SET name = ?, manufacturer_id = ?, supplier_id = ?, effects = ?, category_id = ?, price = ?, quantity = ? WHERE medicine_id = ?',
         [
            name,
            manufacturer_id,
            supplier_id,
            effects,
            category_id,
            price,
            quantity,
            medicine_id,
         ]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).send('Medicine not found');
      }

      await connection.commit();
      res.status(200).send('Medicine updated successfully');
   } catch (error) {
      await connection.rollback();
      res.status(500).send('Error updating medicine');
   }
};

// Xóa một loại thuốc theo ID
const deleteMedicine = async (req, res) => {
   const { medicine_id } = req.params;
   try {
      await connection.beginTransaction();

      const [result] = await connection.query(
         'DELETE FROM Medicine WHERE medicine_id = ?',
         [medicine_id]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).send('Medicine not found');
      }

      await connection.commit();
      res.status(200).send('Medicine deleted successfully');
   } catch (error) {
      await connection.rollback();
      res.status(500).send('Error deleting medicine');
   }
};

export default {
   getMedicines,
   getMedicineById,
   createMedicine,
   updateMedicine,
   deleteMedicine,
};
