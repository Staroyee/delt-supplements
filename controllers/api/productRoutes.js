const router = require('express').Router();
const { Op } = require('sequelize');
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  // Find all products
  // be sure to include its associated Category and Tag data
  try {
    const products = await Product.findAll({ include: [Category, {
      model: Tag,
      through: ProductTag,
    }]
  });
    if(!products) {
      res.status(404).json({ message: 'No products found'});
      return;
    }
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get one product
router.get('/:id', async (req, res) => {
  // Find a single product by its `id`
  // be sure to include its associated Category and Tag data
  try {
    const products = await Product.findByPk(req.params.id, { include: [Category, {
      model: Tag,
      through: ProductTag,
    }]
  });
    if(!products) {
      res.status(404).json({ message: 'No products found'});
      return;
    }
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

// router.get('/search/:searchTerm', async (req, res) => {
//   try {
//     const productData = await Product.findAll({
//       where: {
//         product_name: {
//           [Op.like]: `%${req.params.searchTerm}%`,
//         },
//       },
//       include: [
//         {
//           model: Category,
//           attributes: ['category_name'],
//         },
//       ],
//     });
//     // const products = productData.map((product) => product.get({ plain: true }));
//     // console.log(products);
    
//     res.status(200).json(productData);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json(err);
//   }
// });

// Create new product
router.post('/', (req, res) => {
  Product.create(req.body)
    .then((product) => {
      // If there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds?.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// Update product
router.put('/:id', (req, res) => {
  // Update product data
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      if (req.body.tagIds && req.body.tagIds.length) {
        
        ProductTag.findAll({
          where: { product_id: req.params.id }
        }).then((productTags) => {
          // Create filtered list of new tag_ids
          const productTagIds = productTags.map(({ tag_id }) => tag_id);
          const newProductTags = req.body.tagIds
          .filter((tag_id) => !productTagIds.includes(tag_id))
          .map((tag_id) => {
            return {
              product_id: req.params.id,
              tag_id,
            };
          });

            // Figure out which ones to remove
          const productTagsToRemove = productTags
          .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
          .map(({ id }) => id);
                  // Run both actions
          return Promise.all([
            ProductTag.destroy({ where: { id: productTagsToRemove } }),
            ProductTag.bulkCreate(newProductTags),
          ]);
        });
      }

      return res.json(product);
    })
    .catch((err) => {
      // Console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', async (req, res) => {
  // Delete one product by its `id` value
  try {
    const products = await Product.destroy({
      where: {
        id: req.params.id,
      },
    });
    if(!products) {
      res.status(404).json({ message: 'No products found with this id!'});
      return;
    }
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
