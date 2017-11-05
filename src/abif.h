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

#ifndef ABIF_H
#define ABIF_H

#include <vector>
#include <iostream>
#include <cmath>
#include <fstream>
#include <string>
#include <iterator>
#include <algorithm>

namespace teal
{

struct Abif {
  std::string key;
  std::string name;
  int32_t number;
  int16_t etype;
  int16_t esize;
  int32_t nelements;
  int32_t dsize;
  int32_t doffset;
};

struct Trace {
  typedef int16_t TValue;
  typedef std::vector<TValue> TMountains;
  typedef std::vector<TMountains> TACGTMountains;
  typedef std::vector<uint8_t> TQual;
  
  std::string basecalls1;
  std::string basecalls2;
  TQual qual;
  TMountains basecallpos;
  TACGTMountains traceACGT;
};


struct BaseCalls {
  typedef Trace::TValue TValue;
  typedef std::vector<TValue> TPosition;
  typedef std::vector<TPosition> TPositionACGT;
  typedef std::vector<float> TPeak;
  typedef std::vector<TPeak> TPeakACGT;
  
  bool indelshift;
  uint16_t ltrim;
  uint16_t rtrim;
  uint16_t breakpoint;
  std::string consensus;
  std::string primary;
  std::string secondary;
  TPosition bcPos;
  TPeakACGT peak;
  TPositionACGT pos;

  BaseCalls() {
    peak.resize(4);
    pos.resize(4);
  }
};

template<typename TMountains>
inline void
findLocalMaxima(TMountains const& trace, TMountains& pos) {
  for(uint32_t i = 1; i < trace.size() - 1; ++i) {
    if (((trace[i-1] <= trace[i]) && (trace[i] > trace[i+1])) || ((trace[i-1] < trace[i]) && (trace[i] >= trace[i+1]))) pos.push_back(i);
  }
}

template<typename TMountains>
inline void
peak(TMountains const& trace, TMountains const& maxima, float const s, float const e, typename TMountains::value_type& bestVal, typename TMountains::value_type& bestIdx) {
  bestVal = 0;
  bestIdx = 0;
  for(uint32_t i = 0; i<maxima.size(); ++i) {
    if (((float) maxima[i] > s) && ((float) maxima[i] < e)) {
      if (trace[maxima[i]] > bestVal) {
	bestIdx = maxima[i];
	bestVal = trace[maxima[i]];
      }
    }
  }
}

template<typename TMountains>
inline char
iupac(TMountains const& p) {
  if (p.size() == 1) {
    if (p[0] == 0) return 'A';
    else if (p[0] == 1) return 'C';
    else if (p[0] == 2) return 'G';
    else if (p[0] == 3) return 'T';
  } else if (p.size() == 2) {
    if ((p[0] == 0) && (p[1] == 2)) return 'R';
    else if ((p[0] == 1) && (p[1] == 3)) return 'Y';
    else if ((p[0] == 1) && (p[1] == 2)) return 'S';
    else if ((p[0] == 0) && (p[1] == 3)) return 'W';
    else if ((p[0] == 2) && (p[1] == 3)) return 'K';
    else if ((p[0] == 0) && (p[1])) return 'M';
  }
  return 'N';
}

inline char
iupac(char const one, char const two) {
  typedef Trace::TMountains TMountains;
  TMountains p(2, 0);
  if (one == 'A') p[0] = 0;
  else if (one == 'C') p[0] = 1;
  else if (one == 'G') p[0] = 2;
  else if (one == 'T') p[0] = 3;
  if (two == 'A') p[1] = 0;
  else if (two == 'C') p[1] = 1;
  else if (two == 'G') p[1] = 2;
  else if (two == 'T') p[1] = 3;
  if (p[1] < p[0]) {
    int16_t tmp = p[0];
    p[0] = p[1];
    p[1] = tmp;
  }
  return iupac(p);
}
  

inline std::string
readBinStr(std::vector<char> const& buffer, int32_t pos, int32_t len) {
  return std::string(buffer.begin() + pos, buffer.begin() + pos + len);
}

inline uint8_t
readBinUI8(std::vector<char> const& buffer, int32_t pos) {
  return (uint8_t)(buffer[pos]);
}

inline int32_t
readBinI32(std::vector<char> const& buffer, int32_t pos) {
  return (((uint32_t) 0) | ((uint8_t)(buffer[pos])<<24) | ((uint8_t)(buffer[pos+1])<<16) | ((uint8_t)(buffer[pos+2])<<8) | ((uint8_t)(buffer[pos+3])));
}

inline int16_t
readBinI16(std::vector<char> const& buffer, int32_t pos) {
  return (((uint16_t) 0) | ((uint8_t)(buffer[pos])<<8) | ((uint8_t)(buffer[pos+1])));
}

inline std::string
replaceNonDna(std::string const& str) {
  std::string out;
  for(uint32_t i = 0; i<str.size();++i) {
    if ((str[i] == 'A') || (str[i] == 'C') || (str[i] == 'G') || (str[i] == 'T')) out = out.append(str, i, 1);
    else out = out.append("N");
  }
  return out;
}

inline bool
readab(std::string const& filename, Trace& tr) {
  typedef Trace::TACGTMountains TACGTMountains;
  typedef TACGTMountains::value_type TMountains;
  TACGTMountains trace(4, TMountains());
  std::string acgtOrder;

  // Read the mountains
  std::ifstream bfile(filename.c_str(), std::ios_base::binary | std::ios::ate);
  std::streamsize bsize = bfile.tellg();
  bfile.seekg(0, std::ios::beg);
  std::vector<char> buffer(bsize);
  if (bfile.read(buffer.data(), bsize)) {
    std::string filetype = readBinStr(buffer, 0, 4);
    if (filetype != "ABIF") {
      std::cerr << "File is not in ABIF format!" << std::endl;
      bfile.close();
      return false;
    }
    //int16_t version = readBinI16(buffer, 4);
    //std::string name = readBinStr(buffer, 6, 4);
    //int32_t number = readBinI32(buffer, 10);
    //int16_t etype = readBinI16(buffer, 14);
    int16_t esize = readBinI16(buffer, 16);
    int32_t nelements = readBinI32(buffer, 18);
    int32_t offset = readBinI32(buffer, 26);
    //int32_t handle = readBinI32(buffer, 30);
    //std::cout << filetype << '\t' << version << '\t' << name << '\t' << number << '\t' << etype << '\t' << esize << '\t' << nelements << '\t' << offset << '\t' << handle << std::endl;

    // Get all ABIF records
    std::vector<Abif> abi;
    for (int32_t i = 0; i < nelements; ++i) {
      int32_t ofs = i * esize + offset;
      std::vector<char> entry(buffer.begin()+ofs, buffer.begin()+ofs+esize);
      Abif ab;
      ab.name = readBinStr(entry, 0, 4);
      ab.number = readBinI32(entry, 4);
      ab.etype = readBinI16(entry, 8);
      ab.esize = readBinI16(entry, 10);
      ab.nelements = readBinI32(entry, 12);
      ab.dsize = readBinI32(entry, 16);
      ab.doffset = readBinI32(entry, 20);
      ab.key = ab.name + "." + std::to_string(ab.number);
      if (ab.name == "PCON") ab.etype = 1;
      abi.push_back(ab);
      //std::cout << ab.key << "\t" << ab.name << "\t" << ab.number << "\t" << ab.etype << "\t" << ab.esize << "\t" << ab.nelements << "\t" << ab.dsize << "\t" << ab.doffset << std::endl;
    }

    // Get what we need and dump the rest of this stupid format
    for(uint32_t i = 0; i < abi.size(); ++i) {
      int32_t ofs = i * esize + offset;
      int32_t ofsraw = ofs + 20;
      if (abi[i].dsize > 4) ofsraw = abi[i].doffset;
      std::vector<char> entry(buffer.begin()+ofsraw, buffer.begin()+ofsraw + abi[i].nelements*abi[i].esize + 1);
      if (abi[i].etype == 2) {
	if (abi[i].key == "PBAS.2") tr.basecalls1 = replaceNonDna(readBinStr(entry, 0, entry.size()));
	else if (abi[i].key == "P2BA.1") tr.basecalls2 = replaceNonDna(readBinStr(entry, 0, entry.size()));
	else if (abi[i].key == "FWO_.1") acgtOrder = readBinStr(entry, 0, entry.size());
      } else if (abi[i].etype == 4) {
	if (abi[i].key == "PLOC.2") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    tr.basecallpos.push_back(readBinI16(entry, k*2));
	  }
	} else if (abi[i].key == "DATA.9") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    trace[0].push_back(readBinI16(entry, k*2));
	  }
	} else if (abi[i].key == "DATA.10") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    trace[1].push_back(readBinI16(entry, k*2));
	  }
	} else if (abi[i].key == "DATA.11") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    trace[2].push_back(readBinI16(entry, k*2));
	  }
	} else if (abi[i].key == "DATA.12") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    trace[3].push_back(readBinI16(entry, k*2));
	  }
	}
      } else if (abi[i].etype == 1) {
	if (abi[i].key == "PCON.2") {
	  for(int32_t k = 0; k < abi[i].nelements; ++k) {
	    tr.qual.push_back(readBinUI8(entry, k));
	  }
	}
      }
    }
  }
  bfile.close();

  // Fix size of basecall vectors
  uint32_t minsize1 = std::min(tr.basecalls1.size(), tr.basecalls2.size());
  uint32_t minsize2 = std::min(tr.qual.size(), tr.basecallpos.size());
  uint32_t minsize = std::min(minsize1, minsize2);
  tr.basecallpos.resize(minsize);
  tr.basecalls1.resize(minsize);
  tr.basecalls2.resize(minsize);
  tr.qual.resize(minsize);

  // Assign trace
  tr.traceACGT.resize(4, TMountains());
  for(uint32_t i = 0; i < acgtOrder.size(); ++i) {
    if (acgtOrder[i] == 'A') tr.traceACGT[0] = trace[i];
    else if (acgtOrder[i] == 'C') tr.traceACGT[1] = trace[i];
    else if (acgtOrder[i] == 'G') tr.traceACGT[2] = trace[i];
    else if (acgtOrder[i] == 'T') tr.traceACGT[3] = trace[i];
  }
  
  // Close input file
  return true;
}


inline void
basecall(Trace const& tr, BaseCalls& bc, float sigratio) {
  typedef Trace::TACGTMountains TACGTMountains;
  typedef TACGTMountains::value_type TMountains;
  typedef TMountains::value_type TValue;
  TACGTMountains peakACGT(4, TMountains());
  for(uint32_t k = 0; k<4; ++k) findLocalMaxima(tr.traceACGT[k], peakACGT[k]);

  // Get peak regions
  std::vector<float> st;
  std::vector<float> ed;
  TValue oldVal = 0;
  TValue lastDiff = 0;
  for(uint32_t i = 0; i<tr.basecallpos.size(); ++i) {
    lastDiff = tr.basecallpos[i] - oldVal;
    st.push_back((float) tr.basecallpos[i] - 0.5 * (float) lastDiff);
    if (i > 0) ed.push_back((float) tr.basecallpos[i-1] + 0.5 * (float) lastDiff);
    oldVal = tr.basecallpos[i];
  }
  ed.push_back(tr.basecallpos[tr.basecallpos.size()-1] + 0.5 * lastDiff);

  // Call peaks
  std::vector<char> primary;
  std::vector<char> secondary;
  std::vector<char> consensus;
  for(uint32_t i = 0; i<st.size(); ++i) {
    TMountains pVal(4, 0);
    TMountains pIdx(4, 0);
    for(uint32_t k = 0; k<4; ++k) 
      peak(tr.traceACGT[k], peakACGT[k], st[i], ed[i], pVal[k], pIdx[k]);
    if ((pVal[0] == 0) && (pVal[1] == 0) && (pVal[2] == 0) && (pVal[3] == 0)) continue;
    TValue maxVal = 0;
    for(uint32_t k = 0; k<4; ++k) {
      if (pVal[k] > maxVal) maxVal = pVal[k];
      bc.peak[k].push_back(pVal[k]);
      bc.pos[k].push_back(pIdx[k]);
    }
    std::vector<float> srat(4, 0);
    float bestRat = 0;
    TValue bestIdx = 0;
    int32_t validBases = 0;
    for(uint32_t k = 0; k<4; ++k) {
      srat[k] = (float) pVal[k] / (float) maxVal;
      if (srat[k] >= sigratio) ++validBases;
      if (srat[k] > bestRat) {
	bestRat = srat[k];
	bestIdx = k;
      }
    }
    bc.bcPos.push_back(pIdx[bestIdx]);
    if ((validBases == 4) || (validBases == 0)) {
      primary.push_back('N');
      secondary.push_back('N');
      consensus.push_back('N');
    } else if (validBases > 1) {
      if (bestIdx == 0) primary.push_back('A');
      else if (bestIdx == 1) primary.push_back('C');
      else if (bestIdx == 2) primary.push_back('G');
      else if (bestIdx == 3) primary.push_back('T');
      TMountains leftover;
      for(int32_t k = 0; k<4; ++k) 
	if ((k != bestIdx) && (srat[k] >= sigratio)) leftover.push_back(k);
      secondary.push_back(iupac(leftover));
      consensus.push_back('N');
    } else {
      if (bestIdx == 0) {
	primary.push_back('A');
	secondary.push_back('A');
	consensus.push_back('A');
      } else if (bestIdx == 1) {
	primary.push_back('C');
	secondary.push_back('C');
	consensus.push_back('C');
      } else if (bestIdx == 2) {
	primary.push_back('G');
	secondary.push_back('G');
	consensus.push_back('G');
      } else if (bestIdx == 3) {
	primary.push_back('T');
	secondary.push_back('T');
	consensus.push_back('T');
      }
    }
  }
  bc.primary = std::string(primary.begin(), primary.end());
  bc.secondary = std::string(secondary.begin(), secondary.end());
  bc.consensus = std::string(consensus.begin(), consensus.end());
}


inline std::string
trimmedPSeq(BaseCalls const& bc) {
  uint16_t len = bc.primary.size() - bc.ltrim - bc.rtrim;
  return bc.primary.substr(bc.ltrim, len);
}

inline std::string
trimmedSecSeq(BaseCalls const& bc) {
  uint16_t len = bc.secondary.size() - bc.ltrim - bc.rtrim;
  return bc.secondary.substr(bc.ltrim, len);
}

inline std::string
trimmedCSeq(BaseCalls const& bc) {
  uint16_t len = bc.consensus.size() - bc.ltrim - bc.rtrim;
  return bc.consensus.substr(bc.ltrim, len);
}

inline uint16_t
_estimateCut(std::vector<double> const& score) {
  double cumscore = 0;
  uint16_t wsize = 50;
  uint16_t hsize = score.size() / 2;
  for(uint16_t i = 0; ((i < wsize) && (i < hsize)); ++i) cumscore += score[i];
  for(uint16_t k = wsize; k < hsize; ++k) {
    cumscore -= score[k-wsize];
    cumscore += score[k];
    if (cumscore > 0) return k;
  }
  return hsize;
}

inline uint16_t
_estimateCut(std::string const& seq) {
  uint16_t trim = 50;  // Default trim size
  uint16_t ncount = 0;
  uint16_t wsize = trim;
  uint16_t hsize = seq.size() / 2;
  
  for(uint16_t i = 0; ((i < wsize) && (i < hsize)); ++i)
    if ((seq[i] != 'A') && (seq[i] != 'C') && (seq[i] != 'G') && (seq[i] != 'T')) ++ncount;
  for(uint16_t k = wsize; k < hsize; ++k) {
    if ((seq[k-wsize] != 'A') && (seq[k-wsize] != 'C') && (seq[k-wsize] != 'G') && (seq[k-wsize] != 'T')) --ncount;
    if ((seq[k] != 'A') && (seq[k] != 'C') && (seq[k] != 'G') && (seq[k] != 'T')) ++ncount;
    if ((float) ncount / (float) wsize >= 0.1) trim = k;   // take last k above threshold;
  }
  return trim;
}
     

inline bool
estimateTrim(BaseCalls& bc) {
  bc.ltrim = _estimateCut(bc.secondary);
  bc.rtrim = _estimateCut(std::string(bc.secondary.rbegin(), bc.secondary.rend()));

  // Check overall trim size
  if ((uint32_t) (bc.ltrim + bc.rtrim + 10) >= (uint32_t) bc.secondary.size()) {
    std::cerr << "Poor quality Sanger trace where trim sizes are larger than the sequence size!" << std::endl;
    return false;
  }
  return true;
}
  
 
inline bool
estimateTrim(BaseCalls& bc, Trace const& tr) {
  double cutoff = 0.1;

  typedef std::vector<double> TScore;
  TScore score;
  for(uint32_t i = 0; i < tr.qual.size(); ++i) score.push_back(cutoff - std::pow((double) 10, (double) tr.qual[i] / (double) -10.0));

  bc.ltrim = _estimateCut(score);
  TScore rev(score.rbegin(), score.rend());
  bc.rtrim = _estimateCut(rev);

  // Check overall trim size
  if ((uint32_t) (bc.ltrim + bc.rtrim + 10) >= (uint32_t) bc.secondary.size()) {
    std::cerr << "Poor quality Sanger trace where trim sizes are larger than the sequence size!" << std::endl;
    return false;
  }
  return true;
}

template<typename TConfig>
inline bool
findBreakpoint(TConfig const& c, BaseCalls& bc) {
  int32_t ncount = 0;
  for(uint32_t i = 0; ((i<c.kmer) && (i<bc.consensus.size())); ++i)
    if (bc.consensus[i] == 'N') ++ncount;
  std::vector<float> nratio;
  nratio.push_back((float)ncount / (float)c.kmer);  
  for(uint32_t i = c.kmer; i < bc.consensus.size(); ++i) {
    if (bc.consensus[i-c.kmer] == 'N') --ncount;
    if (bc.consensus[i] == 'N') ++ncount;
    nratio.push_back((float)ncount / (float)c.kmer);
  }
  float totalN = 0;
  for(uint32_t i = 0; i < nratio.size(); ++i) totalN += nratio[i];
  float leftSum = nratio[0];
  float rightSum = totalN - leftSum;
  float bestDiff = 0;
  bool traceleft = true;
  bc.breakpoint = 0;
  for(uint32_t i = 1; i < nratio.size() - 1; ++i) {
    float right = rightSum / (float)(nratio.size() - i);
    float left = leftSum / (float)i;
    float diff = std::abs(right - left);
    if (diff > bestDiff) {
      bc.breakpoint = i;
      bestDiff = diff;
      if (left < right) traceleft = true;
      else traceleft = false;
    }
    leftSum += nratio[i];
    rightSum -= nratio[i];
  }
  bc.indelshift = true;
  // Forward breakpoint to first N
  for(uint32_t i = bc.breakpoint; i < bc.consensus.size(); ++i) {
    if (bc.consensus[i] == 'N') {
      bc.breakpoint = i;
      break;
    }
  }
  if ((bc.breakpoint <= bc.ltrim) || ((bc.consensus.size() - bc.breakpoint <= bc.rtrim)) || (bestDiff < 0.25)) {
    // No indel shift
    bc.indelshift = false;
    bc.breakpoint = bc.consensus.size() - bc.rtrim - 1;
    traceleft = true;
    bestDiff = 0;
  }


  // Flip trace if indelshift happens to the left
  if (!traceleft) {
    bc.breakpoint = (uint16_t) (bc.consensus.size() - bc.breakpoint - 1);
    std::reverse(bc.consensus.begin(), bc.consensus.end());
    std::reverse(bc.primary.begin(), bc.primary.end());
    std::reverse(bc.secondary.begin(), bc.secondary.end());
    uint16_t tmptrim = bc.ltrim;
    bc.ltrim = bc.rtrim;
    bc.rtrim = tmptrim;
    for(uint32_t k = 0; k<4; ++k) {
      std::reverse(bc.peak[k].begin(), bc.peak[k].end());
      std::reverse(bc.pos[k].begin(), bc.pos[k].end());
    }
  }

  return true;
}

inline void
traceTxtOut(std::string const& outfile, BaseCalls& bc, Trace const& tr) {
  uint16_t backtrim = bc.primary.size() - bc.rtrim;
  uint32_t bcpos = 0;
  uint16_t idx = bc.bcPos[bcpos];
  std::ofstream rfile(outfile.c_str());
  rfile << "pos\tpeakA\tpeakC\tpeakG\tpeakT\tbasenum\tmaxA\tmaxC\tmaxG\tmaxT\tprimary\tsecondary\tconsensus\tqual\ttrim" << std::endl;
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    rfile << (i+1) << "\t";
    for(uint32_t k =0; k<4; ++k) rfile << tr.traceACGT[k][i] << "\t";
    if (idx == i) {
      rfile << (bcpos+1) << "\t";
      for(uint32_t k =0; k<4; ++k) rfile << bc.peak[k][bcpos] << "\t";
      rfile << bc.primary[bcpos] << "\t" << bc.secondary[bcpos] << "\t" << bc.consensus[bcpos] << "\t" << (int32_t) tr.qual[bcpos] << "\t";
      if ((bcpos < bc.ltrim) || (bcpos >= backtrim)) rfile << "Y" << std::endl;
      else rfile << "N" << std::endl;
      idx = bc.bcPos[++bcpos];
    } else rfile << "NA\tNA\tNA\tNA\tNA\tNA\tNA\tNA\tNA\tNA" << std::endl;
  }
}
 
inline void
traceJsonOut(std::string const& outfile, BaseCalls& bc, Trace const& tr) {
  std::ofstream rfile(outfile.c_str());
  rfile << "{" << std::endl;
  rfile << "\"pos\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (i!=0) rfile << ", ";
    rfile << (i+1);
  }
  rfile << "]," << std::endl;
  rfile << "\"peakA\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (i!=0) rfile << ", ";
    rfile << tr.traceACGT[0][i];
  }
  rfile << "]," << std::endl;
  rfile << "\"peakC\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (i!=0) rfile << ", ";
    rfile << tr.traceACGT[1][i];
  }
  rfile << "]," << std::endl;
  rfile << "\"peakG\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (i!=0) rfile << ", ";
    rfile << tr.traceACGT[2][i];
  }
  rfile << "]," << std::endl;
  rfile << "\"peakT\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (i!=0) rfile << ", ";
    rfile << tr.traceACGT[3][i];
  }
  rfile << "]," << std::endl;

  // Basecalls
  uint32_t bcpos = 0;
  uint16_t idx = bc.bcPos[0];
  rfile << "\"basecallPos\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (idx == i) {
      if (i!=bc.bcPos[0]) rfile << ", ";
      rfile << (i+1);
      idx = bc.bcPos[++bcpos];
    }
  }
  rfile << "]," << std::endl;
  bcpos = 0;
  idx = bc.bcPos[0];
  rfile << "\"primary\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (idx == i) {
      if (i!=bc.bcPos[0]) rfile << ", ";
      rfile << "\"" << bc.primary[bcpos] << "\"";
      idx = bc.bcPos[++bcpos];
    }
  }
  rfile << "]," << std::endl;
  bcpos = 0;
  idx = bc.bcPos[0];
  rfile << "\"secondary\": [";
  for(uint32_t i = 0; i<tr.traceACGT[0].size(); ++i) {
    if (idx == i) {
      if (i!=bc.bcPos[0]) rfile << ", ";
      rfile << "\"" << bc.secondary[bcpos] << "\"";
      idx = bc.bcPos[++bcpos];
    }
  }
  rfile << "]" << std::endl;
  rfile << "}" << std::endl;
  rfile.close();
}
 

}

#endif
