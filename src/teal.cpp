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
  float pratio;
  std::string tracein;
  std::string jsonout;
  std::string tsvout;
  std::string version;
  std::string ab;
};


inline void
displayUsage(char** argv, std::string const& version) {
  std::cout << "Teal v" << version << std::endl;
  std::cout << "Usage: " << argv[0] << " trace.ab1 out.json out.tsv" << std::endl;
  std::cout << std::endl;
}

int main(int argc, char** argv) {
  Config c;
  c.version = "0.0.2";

  if (argc < 2) displayUsage(argv, c.version);
  else  if ((std::string(argv[1]) == "version") || (std::string(argv[1]) == "--version") || (std::string(argv[1]) == "--version-only") || (std::string(argv[1]) == "-v")) {
    std::cout << "Teal v" << c.version << std::endl;
  } else if ((std::string(argv[1]) == "help") || (std::string(argv[1]) == "--help") || (std::string(argv[1]) == "-h") || (std::string(argv[1]) == "-?")) {
    displayUsage(argv, c.version);
  } else {
    if (argc < 4) displayUsage(argv, c.version);
    else {
      // Defaults
      c.pratio = 0.33;

      // Parse cmd
      for(int32_t i = 1; i < argc; ++i) {
	if (((std::string(argv[i]) == "-p") || (std::string(argv[i]) == "--pratio")) && (i < argc - 1)) c.pratio = ::atof(argv[++i]);
	else {
	  if (c.tracein.empty()) c.tracein = std::string(argv[i]);
	  else if (c.jsonout.empty()) c.jsonout = std::string(argv[i]);
	  else c.tsvout = std::string(argv[i]);
	}	  
      }
      if ((c.tracein.empty()) || (c.jsonout.empty()) || (c.tsvout.empty())) displayUsage(argv, c.version);
      else {
	// Read *.ab1 file
	Trace tr;
	if (!readab(c.tracein, tr)) return -1;
	
	// Call bases
	BaseCalls bc;
	basecall(tr, bc, c.pratio);

	// Write bases
	traceJsonOut(c.jsonout, bc, tr);
	traceTxtOut(c.tsvout, bc, tr);
      }
    }
  }

  return 0;
}
