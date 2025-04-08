const Branch = require("../models/branch");

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find();
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ message: "Error getting branches" });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "Name and address are required" });
    }

    const newBranch = new Branch({ name, address });
    await newBranch.save();

    res.status(201).json(newBranch);
  } catch (error) {
    res.status(500).json({ message: "Error creating branch" });
  }
};
