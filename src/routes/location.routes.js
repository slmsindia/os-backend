const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Get all countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        phoneCode: true,
        statesCount: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      count: countries.length,
      countries
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries',
      error: error.message
    });
  }
});

// Get states by country
router.get('/states/:countryId', async (req, res) => {
  try {
    const { countryId } = req.params;

    const states = await prisma.state.findMany({
      where: { 
        countryId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        districtsCount: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      count: states.length,
      states
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
});

// Get districts by state
router.get('/districts/:stateId', async (req, res) => {
  try {
    const { stateId } = req.params;

    const districts = await prisma.district.findMany({
      where: { 
        stateId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      count: districts.length,
      districts
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
});

// Get full location hierarchy (country -> states -> districts)
router.get('/hierarchy/:countryId', async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await prisma.country.findUnique({
      where: { id: countryId },
      include: {
        states: {
          where: { isActive: true },
          include: {
            districts: {
              where: { isActive: true },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    res.json({
      success: true,
      country: {
        id: country.id,
        name: country.name,
        code: country.code,
        phoneCode: country.phoneCode,
        states: country.states.map(state => ({
          id: state.id,
          name: state.name,
          code: state.code,
          districts: state.districts.map(district => ({
            id: district.id,
            name: district.name,
            code: district.code
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location hierarchy',
      error: error.message
    });
  }
});

// Search locations
router.get('/search', async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let results = {};

    if (!type || type === 'country') {
      results.countries = await prisma.country.findMany({
        where: { 
          isActive: true,
          name: { contains: query, mode: 'insensitive' }
        },
        take: 10
      });
    }

    if (!type || type === 'state') {
      results.states = await prisma.state.findMany({
        where: { 
          isActive: true,
          name: { contains: query, mode: 'insensitive' }
        },
        include: { country: true },
        take: 10
      });
    }

    if (!type || type === 'district') {
      results.districts = await prisma.district.findMany({
        where: { 
          isActive: true,
          name: { contains: query, mode: 'insensitive' }
        },
        include: { 
          state: {
            include: { country: true }
          }
        },
        take: 10
      });
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations',
      error: error.message
    });
  }
});

module.exports = router;
