const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const parsePositiveInt = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
};

const parseNonNegativeInt = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
};

// GET /api/v1/phong
router.get('/', async (req, res) => {
    try {
        const { loaiPhong } = req.query;

        const danhSachPhong = await prisma.phong.findMany({
            where: loaiPhong ? { loaiPhong } : undefined,
            orderBy: {
                maPhong: 'asc'
            }
        });

        return res.json({
            success: true,
            data: danhSachPhong
        });
    } catch (error) {
        console.error('Loi lay danh sach phong:', error);

        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
    }
});

// GET /api/v1/phong/:maPhong
router.get('/:maPhong', async (req, res) => {
    try {
        const { maPhong } = req.params;

        const phong = await prisma.phong.findUnique({
            where: { maPhong },
            include: {
                hopDongs: true
            }
        });

        if (!phong) {
            return res.status(404).json({
                success: false,
                message: 'Phong khong ton tai'
            });
        }

        return res.json({
            success: true,
            data: phong
        });
    } catch (error) {
        console.error('Loi lay thong tin phong:', error);

        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
    }
});

// POST /api/v1/phong
router.post('/', async (req, res) => {
    try {
        const {
            maPhong,
            soPhong,
            loaiPhong,
            soSinhVienToiDa,
            soSinhVienHienTai
        } = req.body;

        if (!maPhong || !soPhong || !loaiPhong || soSinhVienToiDa === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui long cung cap maPhong, soPhong, loaiPhong va soSinhVienToiDa'
            });
        }

        const maxStudents = parsePositiveInt(soSinhVienToiDa);
        const currentStudents = soSinhVienHienTai === undefined
            ? 0
            : parseNonNegativeInt(soSinhVienHienTai);

        if (maxStudents === null || currentStudents === null) {
            return res.status(400).json({
                success: false,
                message: 'So sinh vien toi da phai lon hon 0 va so sinh vien hien tai khong duoc am'
            });
        }

        if (currentStudents > maxStudents) {
            return res.status(400).json({
                success: false,
                message: 'So sinh vien hien tai khong duoc lon hon so sinh vien toi da'
            });
        }

        const phong = await prisma.phong.create({
            data: {
                maPhong,
                soPhong,
                loaiPhong,
                soSinhVienToiDa: maxStudents,
                soSinhVienHienTai: currentStudents
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Tao phong thanh cong',
            data: phong
        });
    } catch (error) {
        console.error('Loi tao phong:', error);

        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: 'Ma phong da ton tai'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
    }
});

// PUT /api/v1/phong/:maPhong
router.put('/:maPhong', async (req, res) => {
    try {
        const { maPhong } = req.params;
        const {
            soPhong,
            loaiPhong,
            soSinhVienToiDa,
            soSinhVienHienTai
        } = req.body;

        const phongHienTai = await prisma.phong.findUnique({
            where: { maPhong }
        });

        if (!phongHienTai) {
            return res.status(404).json({
                success: false,
                message: 'Phong khong ton tai'
            });
        }

        const data = {};

        if (soPhong !== undefined) data.soPhong = soPhong;
        if (loaiPhong !== undefined) data.loaiPhong = loaiPhong;

        if (soSinhVienToiDa !== undefined) {
            const maxStudents = parsePositiveInt(soSinhVienToiDa);

            if (maxStudents === null) {
                return res.status(400).json({
                    success: false,
                    message: 'So sinh vien toi da phai lon hon 0'
                });
            }

            data.soSinhVienToiDa = maxStudents;
        }

        if (soSinhVienHienTai !== undefined) {
            const currentStudents = parseNonNegativeInt(soSinhVienHienTai);

            if (currentStudents === null) {
                return res.status(400).json({
                    success: false,
                    message: 'So sinh vien hien tai khong duoc am'
                });
            }

            data.soSinhVienHienTai = currentStudents;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Khong co du lieu cap nhat'
            });
        }

        const nextMaxStudents = data.soSinhVienToiDa ?? phongHienTai.soSinhVienToiDa;
        const nextCurrentStudents = data.soSinhVienHienTai ?? phongHienTai.soSinhVienHienTai;

        if (nextCurrentStudents > nextMaxStudents) {
            return res.status(400).json({
                success: false,
                message: 'So sinh vien hien tai khong duoc lon hon so sinh vien toi da'
            });
        }

        const phong = await prisma.phong.update({
            where: { maPhong },
            data
        });

        return res.json({
            success: true,
            message: 'Cap nhat phong thanh cong',
            data: phong
        });
    } catch (error) {
        console.error('Loi cap nhat phong:', error);

        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
    }
});

// DELETE /api/v1/phong/:maPhong
router.delete('/:maPhong', async (req, res) => {
    try {
        const { maPhong } = req.params;

        const phong = await prisma.phong.findUnique({
            where: { maPhong }
        });

        if (!phong) {
            return res.status(404).json({
                success: false,
                message: 'Phong khong ton tai'
            });
        }

        await prisma.phong.delete({
            where: { maPhong }
        });

        return res.json({
            success: true,
            message: 'Xoa phong thanh cong'
        });
    } catch (error) {
        console.error('Loi xoa phong:', error);

        if (error.code === 'P2003') {
            return res.status(409).json({
                success: false,
                message: 'Khong the xoa phong vi dang co du lieu lien quan'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Loi server',
            error: error.message
        });
    }
});

module.exports = router;
