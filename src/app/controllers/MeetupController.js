import * as Yup from 'yup';
import {
  isBefore,
  parseISO,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  startOfDay,
  endOfDay,
  subHours,
} from 'date-fns';
import pt from 'date-fns/locale/pt';
import moment from 'moment';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.string().required(),
      image_id: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body.meetup)))
      return res.status(400).json({ error: 'Validation Fails' });

    const { date, title, description, location, image_id } = req.body.meetup;

    const parsedDate = subHours(new Date(date), 3);

    if (isBefore(parsedDate, new Date()))
      return res.status(400).json({ error: 'Past dates are not permitted' });

    const meetup = await Meetup.create({
      date: parsedDate,
      title,
      description,
      location,
      image_id,
      user_id: req.userId,
    });

    console.log('new meetup', meetup);

    return res.json({ meetup });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.string(),
      image_id: Yup.string(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation Fails' });

    const { date, title, description, location } = req.body.meetup;
    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) return res.status(400).json({ error: 'Meetup não existe' });

    if (meetup.user_id !== req.userId)
      return res
        .status(401)
        .json({ error: 'Apenas o criador pode editar o Meetup' });

    if (meetup.past)
      return res
        .status(401)
        .json({ error: 'Não podem ser modificados Meetups passados' });

    const parsedDate = subHours(new Date(date), 3);

    if (isBefore(parsedDate, new Date()))
      return res.status(400).json({ error: 'Data passada' });

    try {
      const savedMeetup = await meetup.update({
        title,
        description,
        location,
        date: parsedDate,
      });
      return res.json({ meetup: savedMeetup });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  async index(req, res) {
    const { date, page = 1 } = req.query;
    const parsedDate = parseISO(date);
    const meetups = await Meetup.findAll({
      limit: 10,
      offset: (page - 1) * 10,
      subQuery: false,
      where: {
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
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
    });
    return res.json({ meetups });
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);
    if (meetup.user_id !== req.userId)
      return res.status(401).json({ error: 'Você não está autorizado' });
    await meetup.destroy();
    return res.json({
      message: `Meetup '${meetup.title}' removida com sucesso`,
    });
  }
}

export default new MeetupController();
