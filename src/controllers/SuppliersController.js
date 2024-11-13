import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

import connection from '../config/database.js';
import {
   generateAccessToken,
   generateRefreshToken,
} from '../middlewares/jwtMiddleware.js';

const generateUserId = async () => {
   const [lastId] = await connection.query('SELECT MAX(id) AS maxId FROM user');
   const maxId = lastId[0].maxId;

   // Kiểm tra nếu maxId là null và khởi tạo newId
   if (maxId) {
      const numericId = parseInt(maxId.replace('EP_', ''), 10); // Chuyển đổi thành số
      if (isNaN(numericId)) {
         throw new Error('Invalid maxId format'); // Ném lỗi nếu không thể chuyển đổi
      }
      console.log('maxId: ', maxId);
      return `EP_${String(numericId + 1).padStart(2, '0')}`;
   } else {
      console.log('maxId: ', maxId);
      return 'EP_01'; // Nếu không có người dùng nào, bắt đầu từ EP_01
   }
};

const register = async (req, res) => {
   const {
      username,
      password,
      fullname,
      address,
      phoneNumber,
      role = 'staff',
   } = req.body;

   try {
      await connection.beginTransaction();
      if (!username || !password || !fullname || !address || !phoneNumber) {
         return res
            .status(400)
            .json({ message: 'Bạn cần cung cấp đầy đủ thông tin.' });
      }

      // Kiểm tra mật khẩu
      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
         return res.status(400).json({
            message:
               'Mật khẩu phải gồm kí tự in hoa, kí tự thường, số và kí tự đặc biệt',
         });
      }

      // Kiểm tra số điện thoại
      if (!/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
         return res.status(400).json({
            message:
               'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
         });
      }

      // Kiểm tra username đã tồn tại
      // const [existingUser] = await connection.query('SELECT check_if_username_exists(?) AS exists', [username]);
      const [existingUser] = await connection.query(
         'SELECT check_if_username_exists(?) AS `exists`',
         [username]
      );
      if (existingUser[0].exists) {
         return res.status(400).json({
            message: 'Username đã tồn tại. Hãy đăng kí username khác',
         });
      }

      // Sử dụng auto-increment cho employee_id hoặc tạo ID tùy theo yêu cầu
      const [lastId] = await connection.query(
         'SELECT MAX(employee_id) AS maxId FROM employees'
      );
      const maxId = lastId[0].maxId;
      const newId = maxId
         ? `EP${String(parseInt(maxId.replace('EP', '')) + 1).padStart(2, '0')}`
         : 'EP01';

      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Thêm người dùng mới vào cơ sở dữ liệu
      await connection.query(
         'INSERT INTO employees (employee_id, username, password, fullname, address, phoneNumber, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
         [newId, username, hashedPassword, fullname, address, phoneNumber, role]
      );
      await connection.commit();

      // Lấy thông tin người dùng mới đã đăng ký
      const [newUser] = await connection.query(
         'SELECT employee_id, username, fullname, address, phoneNumber, role, createdAt, updatedAt FROM employees WHERE username = ?',
         [username]
      );

      console.log('Đăng ký thành công:', newUser[0]);
      return res.status(201).json({
         success: true,
         message: 'Đăng ký tài khoản thành công',
         user: newUser[0],
      });
   } catch (error) {
      await connection.rollback();
      console.error('Error in registration:', error);
      return res.status(500).json({ message: 'Server error', error });
   }
};

const login = asyncHandler(async (req, res) => {
   const { username, password } = req.body;

   if (!username || !password) {
      return res.status(400).json({
         success: false,
         message: 'Người dùng cần nhập username và password',
      });
   }

   // Check if the user exists
   const [user] = await connection.query(
      'SELECT * FROM employees WHERE username = ?',
      [username]
   );

   if (user.length === 0) {
      return res
         .status(404)
         .json({ success: false, message: 'Tài khoản không tồn tại' });
   }

   // Check if the user is locked
   if (user[0].isLocked) {
      return res
         .status(403)
         .json({ success: false, message: 'Tài khoản của bạn đã bị khóa' });
   }

   // Validate password
   const isMatch = await bcrypt.compare(password, user[0].password);
   if (!isMatch) {
      return res
         .status(401)
         .json({ success: false, message: 'Mật khẩu không đúng' });
   }

   // Generate tokens
   const accessToken = generateAccessToken(
      user[0].employee_id,
      user[0].username,
      user[0].role
   );
   const refreshToken = generateRefreshToken(user[0].employee_id);

   const userInfo = {
      employee_id: user[0].employee_id,
      username: user[0].username,
      fullname: user[0].fullname,
      address: user[0].address,
      phoneNumber: user[0].phoneNumber,
      role: user[0].role,
   };

   // await connection.query('UPDATE user SET refreshToken = ? WHERE username = ?', [refreshToken, username]);

   res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 * 7, // 7 day expires refreshToken
   });

   res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      user: userInfo,
   });
});

const logout = asyncHandler(async (req, res) => {
   const cookie = req.cookies;

   // Check if the refreshToken exists in cookies
   // if (!cookie || !cookie.refreshToken) {
   //     return res.status(400).json({ success: false, message: 'Not found refresh token in cookies' });
   // }

   // Delete refreshToken from the database
   // const [result] = await connection
   //
   //     .query('UPDATE user SET refreshToken = NULL WHERE refreshToken = ?', [cookie.refreshToken]);

   // if (result.affectedRows === 0) {
   //     return res.status(400).json({ success: false, message: 'Refresh token not found in the database' });
   // }
   res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
   });
   return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công',
   });
});

const getAllSuppliers = async (req, res) => {
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
      const [rows] = await connection.query('SELECT * FROM Suppliers');

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
      res.status(500).send('Error fetching suppliers');
   }
};

const createSupplier = asyncHandler(async (req, res) => {
   try {
      const { supplier_id, name, address, representative } = req.body;
      const currentRoleUser = req.user.role;

      await connection.beginTransaction();
      if (currentRoleUser !== 'admin' && currentRoleUser !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo nhà cung cấp mới.',
         });
      }

      // Kiểm tra dữ liệu đầu vào
      if (!supplier_id || !name || !address || !representative) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ thông tin',
         });
      }

      await connection.query(
         'INSERT INTO Suppliers (supplier_id, name, address, representative) VALUES (?, ?, ?, ?)',
         [supplier_id, name, address, representative]
      );

      // Lấy thông tin người dùng mới
      const [newSupplier] = await connection.query(
         'SELECT supplier_id, name, address, representative FROM Suppliers WHERE supplier_id = ?',
         [supplier_id]
      );

      await connection.commit();

      res.status(201).json({
         success: true,
         message: 'Tạo nhà cung cấp mới thành công',
         newSupplier,
      });
   } catch (error) {
      if (connection) await connection.rollback();

      res.status(500).json(error);
   }
});

const updateSupplier = asyncHandler(async (req, res) => {
   const { id } = req.params;

   const { supplier_id, name, address, representative } = req.body;

   const currentUserRole = req.user.role;
   // Requesting user's role from JWT or session
   const currentUserId = req.user.id;

   // Kiểm tra quyền admin
   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền chỉnh sửa thông tin nhà cung cấp.',
      });
   }

   if (!supplier_id || !name || !address || !representative) {
      return res.status(400).json({
         success: false,
         message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
   }

   await connection.beginTransaction();
   try {
      const [updatedSupplier] = await connection.query(
         'SELECT * FROM Suppliers WHERE supplier_id = ?',
         [id]
      );
      if (updatedSupplier.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Nhà cung cấp không tồn tại' });
      }

      const [result] = await connection.query(
         'UPDATE Suppliers SET supplier_id = ?, name = ?, address = ?, representative = ? WHERE supplier_id = ?',
         [supplier_id, name, address, representative, id]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy nhà cung cấp',
         });
      }

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin nhà cung cấp có mã ${id} thành công`,
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

const deleteSupplier = async (req, res) => {
   try {
      const currentUserRole = req.user.role;

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá nhà cung cấp.',
         });
      }
      const { id } = req.params;
      await connection.beginTransaction();

      // Execute the delete query within the transaction
      const [result] = await connection.query(
         'DELETE FROM Suppliers WHERE supplier_id = ?',
         [id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the detail doesn't exist
         await connection.rollback();
         return res.status(404).json({ message: 'Nhà cung cấp không tồn tại' });
      }

      // Commit the transaction if the delete is successful
      await connection.commit();
      res.status(200).json({ message: 'Nhà cung cấp đã được xóa' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }

   // Kiểm tra xem người dùng cần xóa có tồn tại không
};

const getSupplierById = async (req, res) => {
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
         'SELECT * FROM Suppliers WHERE supplier_id = ?',
         [id]
      );

      if (rows.length === 0) {
         await connection.rollback(); // Rollback in case of not found to keep transaction clean
         return res.status(404).send('Supplier not found');
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
const lockUser = async (req, res) => {
   const { id } = req.params; // ID người dùng cần khóa/mở khóa
   const currentRole = req.user.role;
   const currentUsername = req.user.username;

   await connection.beginTransaction();
   try {
      // Kiểm tra người dùng tồn tại
      const [user] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (user.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Người dùng không tồn tại' });
      }

      const targetRoleUser = user[0].role;
      const targetIsLocked = user[0].isLocked;

      if (currentRole !== 'admin') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Chỉ có admin mới được phép khoá/mở khoá',
         });
      }

      // Ngăn không cho khóa/mở khóa chính mình
      if (user[0].username === currentUsername) {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Không được khóa/mở khóa chính mình',
         });
      }

      // Ngăn không cho khóa/mở khóa người cùng role
      if (currentRole === targetRoleUser) {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Không được khóa/mở khóa người có cùng chức vụ',
         });
      }

      // Chỉ cho phép admin khóa/mở khóa staff
      if (currentRole === 'admin' && targetRoleUser !== 'staff') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Admin chỉ có thể khóa/mở khóa staff',
         });
      }

      // Đảo ngược trạng thái khóa/mở khóa
      const newIsLocked = !targetIsLocked;
      await connection.query(
         'UPDATE employees SET isLocked = ? WHERE employee_id = ?',
         [newIsLocked, id]
      );
      const action = newIsLocked ? 'Khóa' : 'Mở Khóa';
      console.log(`User với ID ${id} đã được ${action} bởi ${currentRole}`);

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `${action} tài khoản người dùng với ID ${id}`,
      });
   } catch (error) {
      // Rollback transaction nếu có lỗi
      await connection.rollback();
      console.error('Lỗi khi khóa/mở khóa người dùng:', error);
      res.status(500).json({
         success: false,
         message: 'Có lỗi xảy ra, không thể thực hiện khóa/mở khóa.',
         error: error.message,
      });
   }
};

const getDetailUser = asyncHandler(async (req, res) => {
   const { id } = req.params; // Lấy id từ URL parameters

   // Kiểm tra xem người dùng có tồn tại không
   const [user] = await connection.query(
      'SELECT * FROM employees WHERE employee_id = ?',
      [id]
   );
   if (user.length === 0) {
      return res
         .status(404)
         .json({ success: false, message: 'Người dùng không tồn tại' });
   }

   const userInfo = {
      id: user[0].id,
      username: user[0].username,
      fullname: user[0].fullname,
      address: user[0].address,
      phoneNumber: user[0].phoneNumber,
      role: user[0].role,
      isLocked: user[0].isLocked, // Nếu cần, có thể thêm trường này
   };

   return res.status(200).json({ success: true, userInfo });
});

const filterUser = asyncHandler(async (req, res) => {
   const { query, sortBy = 'username', order = 'asc' } = req.query; // Lấy query tìm kiếm và thông tin sắp xếp từ request
   // query: tìm từ ở tất cả fields

   // Kiểm tra thông tin sắp xếp
   const validSortFields = ['username', 'address', 'fullname', 'phoneNumber'];
   if (!validSortFields.includes(sortBy)) {
      return res
         .status(400)
         .json({ success: false, message: 'Thông tin sắp xếp không hợp lệ' });
   }

   const validOrder = ['asc', 'desc'];
   if (!validOrder.includes(order)) {
      return res
         .status(400)
         .json({ success: false, message: 'Thứ tự sắp xếp không hợp lệ' });
   }

   // Kiểm tra nếu query là phoneNumber và chỉ cho phép số
   if (query && sortBy === 'phoneNumber' && isNaN(query)) {
      return res.status(400).json({
         success: false,
         message: 'Query phải là số khi tìm kiếm theo số điện thoại.',
      });
   }

   // Tạo điều kiện tìm kiếm
   const searchCondition = query
      ? 'WHERE username LIKE ? OR address LIKE ? OR fullname LIKE ? OR phoneNumber LIKE ?'
      : '';
   const searchValues = query
      ? [
           `%${query}%`,
           `%${query}%`,
           `%${query}%`,
           `%${query}%`,
           //   query,
        ]
      : [];

   // Thực hiện truy vấn
   const [users] = await connection.query(
      `SELECT username, fullname, address, phoneNumber FROM employees ${searchCondition} ORDER BY ${sortBy} ${order}`,
      searchValues
   );

   res.status(200).json({
      success: true,
      users,
   });
});

const changePassword = async (req, res) => {
   const { id } = req.user; // Lấy id từ thông tin người dùng
   const { currentPassword, newPassword } = req.body;

   await connection.beginTransaction();
   try {
      // Kiểm tra xem người dùng đã cung cấp đầy đủ thông tin chưa
      if (!id || !currentPassword || !newPassword) {
         return res.status(400).json({
            message: 'Bạn cần cung cấp đủ thông tin để đổi mật khẩu.',
         });
      }

      // Kiểm tra mật khẩu mới
      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
         return res.status(400).json({
            message:
               'Mật khẩu mới phải gồm kí tự in hoa, kí tự thường, số và kí tự đặc biệt',
         });
      }

      // Lấy thông tin người dùng từ cơ sở dữ liệu
      const [user] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (user.length === 0) {
         await connection.rollback();
         return res.status(404).json({ message: 'Người dùng không tồn tại.' });
      }

      // Kiểm tra mật khẩu hiện tại
      const isMatch = await bcrypt.compare(currentPassword, user[0].password);
      if (!isMatch) {
         await connection.rollback();
         return res
            .status(400)
            .json({ message: 'Mật khẩu hiện tại không đúng.' });
      }

      // Mã hóa mật khẩu mới
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await connection.query(
         'UPDATE employees SET password = ? WHERE employee_id = ?',
         [hashedNewPassword, id]
      );

      await connection.commit();
      console.log('Đổi mật khẩu thành công cho người dùng với ID ', id);
      return res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
   } catch (error) {
      await connection.rollback(); // Hoàn nguyên transaction nếu có lỗi
      console.error('Error in changing password:', error);
      return res
         .status(500)
         .json({ message: 'Server error', error: error.message });
   }
};

const updateInfoMySelf = async (req, res) => {
   const { fullname, address, phoneNumber } = req.body; // Các trường được phép cập nhật
   const id = req.user.id; // Lấy id từ thông tin người dùng đăng nhập (JWT hoặc session)

   if (!id)
      return res.status(401).json({
         success: false,
         message: 'Bạn không được phép cập nhật thông tin chính mình',
      });

   // Kiểm tra ít nhất một trường không để trống
   if (!fullname && !address && !phoneNumber) {
      return res.status(400).json({
         success: false,
         message:
            'Bạn cần nhập ít nhất một trong các thông tin: họ tên, địa chỉ, hoặc số điện thoại để cập nhật',
      });
   }

   // Kiểm tra định dạng số điện thoại
   if (phoneNumber && !/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
         message:
            'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
      });
   }

   // Tạo câu lệnh cập nhật chỉ cho những trường có giá trị
   const updates = [];
   const values = [];

   if (fullname) {
      updates.push('fullname = ?');
      values.push(fullname);
   }
   if (address) {
      updates.push('address = ?');
      values.push(address);
   }
   if (phoneNumber) {
      updates.push('phoneNumber = ?');
      values.push(phoneNumber);
   }

   // Thêm id vào cuối để cập nhật đúng người dùng
   values.push(id);

   await connection.beginTransaction();

   try {
      // Cập nhật thông tin trong cơ sở dữ liệu
      await connection.query(
         `UPDATE employees SET ${updates.join(', ')} WHERE employee_id = ?`,
         values
      );
      await connection.commit();

      console.log(`Cập nhật thông tin thành công cho người dùng với ID ${id}`);
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin thành công cho người dùng với ID ${id}`,
      });
   } catch (error) {
      await connection.rollback();
      console.error('Error updating user info:', error.message);
      return res.status(500).json({
         success: false,
         message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng',
         error: error.message,
      });
   }
};

const getAllUsers = asyncHandler(async (req, res) => {
   try {
      // Lấy tất cả người dùng từ bảng employees
      const [users] = await connection.query('SELECT * FROM employees');

      if (users.length === 0) {
         return res.status(404).json({
            success: false,
            message: 'Không có người dùng nào trong hệ thống',
         });
      }

      // Tạo mảng userInfo chứa thông tin cần thiết của mỗi người dùng
      const userInfo = users.map((user) => ({
         employee_id: user.employee_id,
         username: user.username,
         fullname: user.fullname,
         address: user.address,
         phoneNumber: user.phoneNumber,
         role: user.role,
         isLocked: user.isLocked, // Nếu cần thêm thông tin này
      }));

      return res.status(200).json({
         success: true,
         users: userInfo,
      });
   } catch (error) {
      console.error('Error fetching all users:', error);
      return res.status(500).json({
         success: false,
         message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
      });
   }
});

export default {
   getAllSuppliers,
   createSupplier,
   updateSupplier,
   deleteSupplier,
   getSupplierById,
};
