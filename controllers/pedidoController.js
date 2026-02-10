const res = require('express/lib/response');
const Pedidos = require('../models/Pedidos');
const mongoose = require('mongoose')

exports.nuevoPedido = async (req, res, next) => {
    const pedido = new Pedidos(req.body);
    try {
        await pedido.save();
        res.json({ mensaje: 'Se agregó un nuevo pedido' });
    } catch (error) {
        console.log(error);
        next();
    }
}

// mostrar pedidos 
exports.mostrarPedidos = async (req, res, next) => {
    try { // asi se muestran las relaciones

        const pedidos = await Pedidos.find({}).populate('empleado').populate({
            path: 'lista.insumos',
            model: 'Insumos'
        }).populate({ path: 'local', model: 'Locales' }).populate({ path: 'lista.medida', model: 'Medidas' });
        res.json(pedidos);
    } catch (error) {
        console.log(error);
        next();

    }
}

// mostrar pedidos por cliete
exports.mostrarPedidosLocal = async (req, res, next) => {
    try { // asi se muestran las relaciones

        const pedidos = await Pedidos.find({ $or: [{ local: req.params.idLocal }] }).populate('empleado').populate({
            path: 'lista.insumos',
            model: 'Insumos'
        }).populate({ path: 'local', model: 'Locales' }).populate({ path: 'lista.medida', model: 'Medidas' });
        res.json(pedidos);
    } catch (error) {
        console.log(error);
        next();

    }
}









//mostrar pedido por id
exports.mostrarPedido = async (req, res, next) => {
    const pedido = await Pedidos.findById(req.params.idPedido).populate('empleado').populate({
        path: 'lista.insumos',
        model: 'Insumos'
    }).populate({ path: 'local', model: 'Locales' }).populate({ path: 'lista.medida', model: 'Medidas' });
    if (!pedido) {
        res.json({ mensaje: "ese pedido no existe" });
        return next();
    }
    //si existe mostrar pedido
    res.json(pedido);
}

exports.actualizarPedido = async (req, res, next) => {
    try {
        let pedido = await Pedidos.findOneAndUpdate({ _id: req.params.idPedido }, req.body, {
            new: true
        })
        res.json({ mensaje: 'El pedido fue eliminado correctamente' });

    } catch (error) {
        console.log(error);
        next();
    }
}


exports.eliminarPedido = async (req, res, next) => {
    try {
        await Pedidos.findOneAndDelete({ _id: req.params.idPedido });
        res.json({ mensaje: 'El pedido fue eliminado correctamente' });

    } catch (error) {
        console.log(error);
        next();
    }
}

exports.eliminarTodo = async (req, res, next) => {
  try {
    const { ids } = req.body;

    console.log("IDs recibidos:", ids);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        msg: "Debe enviar una lista de IDs para eliminar",
        success: false 
      });
    }

    // ELIMINAR DIRECTAMENTE SIN VALIDACIÓN CON MONGOOSE
    // MongoDB manejará automáticamente los IDs inválidos
    const resultado = await Pedidos.deleteMany({ _id: { $in: ids } });

    console.log("Resultado de eliminación:", resultado);

    return res.json({
      msg: "Pedidos eliminados correctamente",
      eliminados: resultado.deletedCount,
      success: true
    });

  } catch (error) {
    console.error("Error al eliminar pedidos:", error);
    return res.status(500).json({ 
      msg: "Error al eliminar pedidos", 
      error: error.message,
      success: false 
    });
  }
};

exports.totalInsumoPorIdEntreFechas = async (req, res) => {
  try {
    const { idInsumo, desde, hasta } = req.query;

    if (!mongoose.Types.ObjectId.isValid(idInsumo)) {
      return res.status(400).json({ error: 'idInsumo inválido' });
    }

    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);

    const resultado = await Pedidos.aggregate([
      // 1️⃣ convertir fecha string a Date
      {
        $addFields: {
          fechaDate: {
            $dateFromString: {
              dateString: '$fecha',
              format: '%d/%m/%Y'
            }
          }
        }
      },

      // 2️⃣ filtrar por fecha
      {
        $match: {
          fechaDate: {
            $gte: desdeDate,
            $lte: hastaDate
          }
        }
      },

      // 3️⃣ desarmar lista
      { $unwind: '$lista' },

      // 4️⃣ filtrar por ID directamente (SIN lookup)
      {
        $match: {
          'lista.insumos': new mongoose.Types.ObjectId(idInsumo)
        }
      },

      // 5️⃣ agrupar
      {
        $group: {
          _id: '$lista.insumos',
          vecesPedido: { $sum: 1 },
          cantidadTotal: { $sum: '$lista.cantidad' }
        }
      }
    ]);

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en la consulta' });
  }
};
