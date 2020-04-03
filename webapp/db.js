const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.DBName, process.env.RDS_USERNAME, process.env.RDS_PASSWORD,
    {
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT,
    dialect: 'mysql'
  }
);



// const sequelize = new Sequelize("csye6225", "root", "root",
//   {
//   host: "localhost",
//   port: 3306,
//   dialect: 'mysql'
// }
// );


class User extends Sequelize.Model {}

User.init(
  {
    id: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    email_address: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      isEmail: true
    }
  },
  {
    sequelize,
    timestamps: true,
    updatedAt: 'account_updated',
    createdAt: 'account_created'
  }
);

class Bill extends Sequelize.Model {}

Bill.init(
  {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true
    },
    vendor: {
      type: Sequelize.STRING,
      allowNull: false
    },
    bill_date: {
      type: Sequelize.STRING,
      allowNull: false
    },
      categories: {
          type: Sequelize.JSON
      },

     due_date: {
      type: Sequelize.STRING,
      allowNull: false
    },
      paymentStatus: {
          type: Sequelize.ENUM({
              values: ['paid', 'due', 'past_due', 'no_payment_required']
          }),
          allowNull: false
      },

    amount_due: {
      type: Sequelize.DOUBLE,
      validate: { min: 0.01, max: 1000000 },
      allowNull: false
    },
      attachment: {
          type: Sequelize.JSON
      },
  },
  {
    sequelize,
    timestamps: true,
    updatedAt: 'created_ts',
    createdAt: 'updated_ts'
  }
);
User.hasMany(Bill, { as: 'bills' });

class File extends Sequelize.Model {}

File.init(
    {
        id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true
        },
        file_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        size: {
            type: Sequelize.STRING,
            allowNull: false
        },
        md5: {
            type: Sequelize.STRING,
            allowNull: false
        },
        mime_type: {
            type: Sequelize.STRING,
            allowNull: false
        },
        upload_date: {
            type: Sequelize.DATE,
            allowNull: false
        },
        aws_metadata_etag:{
            type: Sequelize.STRING,
            allowNull: true
        },
        url:{
            type: Sequelize.STRING,
            allowNull: true
        },
        aws_metadata_key:{
            type: Sequelize.STRING,
            allowNull: true
        },
        aws_metadata_bucket:{
            type: Sequelize.STRING,
            allowNull: true
        },

    },
    {
        sequelize,
        timestamps: false
    }
);
Bill.hasOne(File);

const init = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};

module.exports = { User, Bill, File, init };
