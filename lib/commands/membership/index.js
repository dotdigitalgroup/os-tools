#!/usr/bin/env node

const validUserRoles = [
  'admin',
  'baisc-user',
  'edit',
  'view'
]

module.exports = async (options, { os, ns }) => {
  try {
    const { user, role } = options
    const namespaces = ns.namespaceList
    const membershipPromises = namespaces.map(namespace => {
      return os.addProjectMember(namespace, user, role)
    })

    if (validUserRoles.indexOf(role) < 0) {
      throw new Error(`You should specify one of the following roles: ${validUserRoles.join(', ')}`)
    }

    await Promise.all(membershipPromises)
  } catch (e) {
    throw e
  }
}
