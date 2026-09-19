const Agent = require("../models/Agents");
const User = require("../models/Users");
const UserAccount = require("../models/UserAccount");
const LOB = require("../models/LOB");
const Carrier = require("../models/Carrier");
const Policy = require("../models/Policy");

const importPolicies = async (rows) => {
  const agents = new Map();
  const users = new Map();
  const accounts = new Map();
  const lobs = new Map();
  const carriers = new Map();

  // ========================================
  // 1. Prepare unique data from CSV
  // ========================================

  for (const row of rows) {
    // -------------------------
    // Agent
    // -------------------------

    if (row.agent?.trim()) {
      const name = row.agent.trim();

      agents.set(name, {
        name,
      });
    }

    // -------------------------
    // User
    // -------------------------

    if (row.email?.trim()) {
      const email = row.email.trim().toLowerCase();

      users.set(email, {
        firstName: row.firstname?.trim(),
        dob: row.dob || null,
        address: row.address?.trim(),
        phone: row.phone?.trim(),
        state: row.state?.trim(),
        zip: row.zip?.trim(),
        email,
        gender: row.gender?.trim(),
        userType: row.userType?.trim(),
      });
    }

    // -------------------------
    // Account
    // -------------------------

    if (row.account_name?.trim()) {
      const accountName = row.account_name.trim();

      accounts.set(accountName, {
        accountName,
      });
    }

    // -------------------------
    // LOB
    // -------------------------

    if (row.category_name?.trim()) {
      const categoryName = row.category_name.trim();

      lobs.set(categoryName, {
        categoryName,
      });
    }

    // -------------------------
    // Carrier
    // -------------------------

    if (row.company_name?.trim()) {
      const companyName = row.company_name.trim();

      carriers.set(companyName, {
        companyName,
      });
    }
  }

  // ========================================
  // 2. Insert / Update Agents
  // ========================================

  await Agent.bulkWrite(
    [...agents.values()].map((agent) => ({
      updateOne: {
        filter: {
          name: agent.name,
        },
        update: {
          $set: agent,
        },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 3. Insert / Update Users
  // ========================================

  await User.bulkWrite(
    [...users.values()].map((user) => ({
      updateOne: {
        filter: {
          email: user.email,
        },
        update: {
          $set: user,
        },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 4. Insert / Update Accounts
  // ========================================

  await UserAccount.bulkWrite(
    [...accounts.values()].map((account) => ({
      updateOne: {
        filter: {
          accountName: account.accountName,
        },
        update: {
          $set: account,
        },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 5. Insert / Update LOBs
  // ========================================

  await LOB.bulkWrite(
    [...lobs.values()].map((lob) => ({
      updateOne: {
        filter: {
          categoryName: lob.categoryName,
        },
        update: {
          $set: lob,
        },
        upsert: true,
      },
    }))
  );

  // ========================================
  // 6. Insert / Update Carriers
  // ========================================

  await Carrier.bulkWrite(
    [...carriers.values()].map((carrier) => ({
      updateOne: {
        filter: {
          companyName: carrier.companyName,
        },
        update: {
          $set: carrier,
        },
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

  // ========================================
  // 8. Create lookup Maps
  // ========================================

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
  // 9. Prepare Policies
  // ========================================

  const policies = rows
    .map((row) => {
      const email = row.email?.trim().toLowerCase();
      const categoryName = row.category_name?.trim();
      const companyName = row.company_name?.trim();

      const userId = userMap.get(email);
      const categoryId = lobMap.get(categoryName);
      const companyId = carrierMap.get(companyName);

      // Skip invalid rows
      if (
        !userId ||
        !categoryId ||
        !companyId ||
        !row.policy_number?.trim()
      ) {
        return null;
      }

      return {
        policyNumber: row.policy_number.trim(),

        policyStartDate: row.policy_start_date || null,

        policyEndDate: row.policy_end_date || null,

        categoryId,

        companyId,

        userId,
      };
    })
    .filter(Boolean);

  // ========================================
  // 10. Insert / Update Policies
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

  // ========================================
  // 11. Return Import Summary
  // ========================================

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