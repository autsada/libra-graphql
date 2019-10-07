class Program {
  constructor({ code, args = [], modules }) {
    this.code = code
    this.args = args
    this.modules = modules
  }
}

module.exports = Program
