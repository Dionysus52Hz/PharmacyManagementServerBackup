import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

import connection from '../config/database.js';
import {
   generateAccessToken,
   generateRefreshToken,
} from '../middlewares/jwtMiddleware.js';

const getAllManufacturers = async (req, res) => {
   try {
      const currentUserRole = req.user.role;
      console.log(currentUserRole);

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem thông tin này.',
         });
      }
      await connection.beginTransaction();
      const [rows] = await connection.query('SELECT * FROM Manufacturers');

      // Commit the transaction (even though no changes are made, it finalizes the read operation)
      await connection.commit();

      // Send the result
      res.status(200).json({
         success: true,
         data: rows,
      });
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).send('Error fetching manufacturers');
   }
};

const createManufacturer = asyncHandler(async (req, res) => {
   try {
      const { manufacturer_id, name, nation } = req.body;
      const currentRoleUser = req.user.role;

      await connection.beginTransaction();
      if (currentRoleUser !== 'admin' && currentRoleUser !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo hãng sản xuất mới.',
         });
      }

      // Kiểm tra dữ liệu đầu vào
      if (!manufacturer_id || !name || !nation) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ thông tin',
         });
      }

      await connection.query(
         'INSERT INTO Manufacturers (manufacturer_id, name, nation) VALUES (?, ?, ?)',
         [manufacturer_id, name, nation]
      );

      // Lấy thông tin người dùng mới
      const [newManufacturer] = await connection.query(
         'SELECT manufacturer_id, name, nation FROM Manufacturers WHERE manufacturer_id = ?',
         [manufacturer_id]
      );

      await connection.commit();

      res.status(201).json({
         success: true,
         message: 'Tạo hãng sản xuất mới thành công',
         newManufacturer,
      });
   } catch (error) {
      if (connection) await connection.rollback();

      res.status(500).json(error);
   }
});

const updateManufacturer = asyncHandler(async (req, res) => {
   const { id } = req.params;

   const { manufacturer_id, name, nation } = req.body;

   const currentUserRole = req.user.role;

   // Kiểm tra quyền admin
   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền chỉnh sửa thông tin hãng sản xuất.',
      });
   }

   if (!manufacturer_id || !name || !nation) {
      return res.status(400).json({
         success: false,
         message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
   }

   await connection.beginTransaction();
   try {
      const [updatedManufacturer] = await connection.query(
         'SELECT * FROM Manufacturers WHERE manufacturer_id = ?',
         [id]
      );
      if (updatedManufacturer.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Hãng sản xuất không tồn tại' });
      }

      const [result] = await connection.query(
         'UPDATE Manufacturers SET manufacturer_id = ?, name = ?, nation = ? WHERE manufacturer_id = ?',
         [manufacturer_id, name, nation, id]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy hãng sản xuất',
         });
      }

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin hãng sản xuất có mã ${id} thành công`,
      });
   } catch (error) {
      // Nếu có lỗi, quay lại trạng thái trước transaction
      await connection.rollback();
      return res.status(500).json({
         success: false,
         message: 'Có lỗi xảy ra, không thể cập nhật thông tin.',
         error: error.message, // Gửi thêm thông tin lỗi chi tiết cho mục đích debug
      });
   }
});

const deleteManufacturer = async (req, res) => {
   try {
      const currentUserRole = req.user.role;

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá hãng sản xuất.',
         });
      }
      const { id } = req.params;
      await connection.beginTransaction();

      // Execute the delete query within the transaction
      const [result] = await connection.query(
         'DELETE FROM Manufacturers WHERE manufacturer_id = ?',
         [id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the detail doesn't exist
         await connection.rollback();
         return res
            .status(404)
            .json({ message: 'Hãng sản xuất không tồn tại' });
      }

      // Commit the transaction if the delete is successful
      await connection.commit();
      res.status(200).json({ message: 'Hãng sản xuất đã được xóa' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }

   // Kiểm tra xem người dùng cần xóa có tồn tại không
};

const getManufacturerById = async (req, res) => {
   const { id } = req.params;
   const currentUserRole = req.user.role;

   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền xem thông tin này.',
      });
   }
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the SELECT query within the transaction
      const [rows] = await connection.query(
         'SELECT * FROM Manufacturers WHERE manufacturer_id = ?',
         [id]
      );

      if (rows.length === 0) {
         await connection.rollback(); // Rollback in case of not found to keep transaction clean
         return res.status(404).send('Manufacturer not found');
      }

      // Commit the transaction after a successful fetch
      await connection.commit();

      // Send the result
      res.json(rows[0]);
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).json(error);
   }
};

export default {
   getAllManufacturers,
   createManufacturer,
   updateManufacturer,
   deleteManufacturer,
   getManufacturerById,
};
