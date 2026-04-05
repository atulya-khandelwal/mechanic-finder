import { sendEmail } from '../services/email.service.js';

export const sendEmailController = async(req, res) => {
    try {
        const { to, subject, html } = req.body;

        const result = await sendEmail({to, subject, html});

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}