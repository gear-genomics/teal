/*
============================================================================
Teal: Trace Viewer
============================================================================
Copyright (C) 2017 Tobias Rausch

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
============================================================================
Contact: Tobias Rausch (rausch@embl.de)
============================================================================
*/

#include "abif.h"

using namespace teal;

struct Config {
  uint16_t oft;   //0: *.json, 1: *.tsv
  float pratio;
  std::string version;
  std::string ab;
};


inline void
displayUsage(char** argv, std::string const& version) {
  std::cout << "Teal v" << version << std::endl;
  std::cout << "Usage: " << argv[0] << " trace.ab1" << std::endl;
  std::cout << std::endl;
}

int main(int argc, char** argv) {
  Config c;
  c.version = "0.0.1";

  if (argc < 2) {
    displayUsage(argv, c.version);
  }
  else  if ((std::string(argv[1]) == "version") || (std::string(argv[1]) == "--version") || (std::string(argv[1]) == "--version-only") || (std::string(argv[1]) == "-v")) {
    std::cout << "Teal v" << c.version << std::endl;
  }
  else if ((std::string(argv[1]) == "help") || (std::string(argv[1]) == "--help") || (std::string(argv[1]) == "-h") || (std::string(argv[1]) == "-?")) {
    displayUsage(argv, c.version);
  }
  else {
    // Set defaults
    c.pratio = 0.33;

    // Read *.ab1 file
    Trace tr;
    if (!readab(argv[1], tr)) return -1;

    // Call bases
    BaseCalls bc;
    basecall(tr, bc, c.pratio);
    if (!estimateTrim(bc)) {
      if (!estimateTrim(bc, tr)) return -1;
    }

    traceJsonOut("out.json", bc, tr);
    traceTxtOut("out.tsv", bc, tr);
  }

  return 0;
}
