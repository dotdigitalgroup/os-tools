#!/usr/bin/env node

const validUserRoles = [
  'admin',
  'basic-user',
  'edit',
  'view',
  'all'
]

module.exports = async (options, { os, ns }) => {
  try {
    const { user, role, revoke } = options
    const namespaces = ns.namespaceList
    const membershipPromises = namespaces.map(namespace => {
      return os.updateMembership(namespace, user, role, revoke)
    })

    if (validUserRoles.indexOf(role) < 0) {
      throw new Error(`You should specify one of the following roles: ${validUserRoles.join(', ')}`)
    }

    await Promise.all(membershipPromises)
  } catch (e) {
    throw e
  }
}
