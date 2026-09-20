const Agent = require("../models/Agents");
const User = require("../models/Users");
const UserAccount = require("../models/UserAccount");
const LOB = require("../models/LOB");
const Carrier = require("../models/Carrier");
const Policy = require("../models/Policy");

const toString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const importPolicies = async (rows) => {
  const agents = new Map();
  const users = new Map();
  const accounts = new Map();
  const lobs = new Map();
  const carriers = new Map();

  // ========================================
  // 1. Prepare unique data from CSV / XLSX
  // ========================================

  for (const row of rows) {
    // Agent
    const agentName = toString(row.agent);

    if (agentName) {
      agents.set(agentName, {
        name: agentName,
      });
    }

    // User
    const email = toString(row.email).toLowerCase();

    if (email) {
      users.set(email, {
        firstName: toString(row.firstname),
        dob: row.dob || null,
        address: toString(row.address),
        phone: toString(row.phone),
        state: toString(row.state),
        zip: toString(row.zip),
        email,
        gender: toString(row.gender),
        userType: toString(row.userType),
      });
    }

    // Account
    const accountName = toString(row.account_name);

    if (accountName) {
      accounts.set(accountName, {
        accountName,
      });
    }

    // LOB
    const categoryName = toString(row.category_name);

    if (categoryName) {
      lobs.set(categoryName, {
        categoryName,
      });
    }

    // Carrier
    const companyName = toString(row.company_name);

    if (companyName) {
      carriers.set(companyName, {
        companyName,
      });
    }
  }

  // ========================================
  // 2. Insert / update Agents
  // ========================================

  await Agent.bulkWrite(
    [...agents.values()].map((agent) => ({
      updateOne: {
        filter: { name: agent.name },
        update: { $set: agent },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 3. Insert / update Users
  // ========================================

  await User.bulkWrite(
    [...users.values()].map((user) => ({
      updateOne: {
        filter: { email: user.email },
        update: { $set: user },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 4. Insert / update Accounts
  // ========================================

  await UserAccount.bulkWrite(
    [...accounts.values()].map((account) => ({
      updateOne: {
        filter: { accountName: account.accountName },
        update: { $set: account },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 5. Insert / update LOBs
  // ========================================

  await LOB.bulkWrite(
    [...lobs.values()].map((lob) => ({
      updateOne: {
        filter: { categoryName: lob.categoryName },
        update: { $set: lob },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 6. Insert / update Carriers
  // ========================================

  await Carrier.bulkWrite(
    [...carriers.values()].map((carrier) => ({
      updateOne: {
        filter: { companyName: carrier.companyName },
        update: { $set: carrier },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 7. Get MongoDB IDs
  // ========================================

  const userDocs = await User.find(
    {
      email: {
        $in: [...users.keys()],
      },
    },
    {
      _id: 1,
      email: 1,
    }
  ).lean();

  const lobDocs = await LOB.find(
    {
      categoryName: {
        $in: [...lobs.keys()],
      },
    },
    {
      _id: 1,
      categoryName: 1,
    }
  ).lean();

  const carrierDocs = await Carrier.find(
    {
      companyName: {
        $in: [...carriers.keys()],
      },
    },
    {
      _id: 1,
      companyName: 1,
    }
  ).lean();

  const userMap = new Map(
    userDocs.map((user) => [
      user.email,
      user._id,
    ])
  );

  const lobMap = new Map(
    lobDocs.map((lob) => [
      lob.categoryName,
      lob._id,
    ])
  );

  const carrierMap = new Map(
    carrierDocs.map((carrier) => [
      carrier.companyName,
      carrier._id,
    ])
  );

  // ========================================
  // 8. Prepare Policies
  // ========================================

  const policies = rows
    .map((row) => {
      const email = toString(row.email).toLowerCase();
      const categoryName = toString(row.category_name);
      const companyName = toString(row.company_name);
      const policyNumber = toString(row.policy_number);

      const userId = userMap.get(email);
      const categoryId = lobMap.get(categoryName);
      const companyId = carrierMap.get(companyName);

      if (
        !userId ||
        !categoryId ||
        !companyId ||
        !policyNumber
      ) {
        return null;
      }

      return {
        policyNumber,

        policyStartDate:
          row.policy_start_date || null,

        policyEndDate:
          row.policy_end_date || null,

        categoryId,
        companyId,
        userId,
      };
    })
    .filter(Boolean);

  // ========================================
  // 9. Insert / update Policies
  // ========================================

  await Policy.bulkWrite(
    policies.map((policy) => ({
      updateOne: {
        filter: {
          policyNumber: policy.policyNumber,
        },
        update: {
          $set: policy,
        },
        upsert: true,
      },
    }))
  );

  return {
    agents: agents.size,
    users: users.size,
    accounts: accounts.size,
    lobs: lobs.size,
    carriers: carriers.size,
    policies: policies.length,
  };
};

module.exports = {
  importPolicies,
};