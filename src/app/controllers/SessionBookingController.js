import { Op } from 'sequelize';
import Booking from '../models/Booking';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class SessionBookingController {
  async index(req, res) {
    const bookings = await Booking.findAll({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          attributes: ['date', 'title', 'location'],
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email'],
            },
            {
              model: File,
              as: 'image',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
      order: [[{ model: Meetup, as: 'meetup' }, 'date']],
    });

    return res.json({ bookings });
  }
}

export default new SessionBookingController();
